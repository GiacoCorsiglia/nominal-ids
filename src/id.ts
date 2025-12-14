import { InvalidTagError } from "./errors.ts";

type IdValue = string | number | bigint;

// This is not a real class!  It's just here to help with typing.
declare abstract class TaggedId<Tag extends string> implements Id {
	readonly tag: Tag;
	readonly key: string;

	toJSON(): string;
	toPostgres(): string;
	[Symbol.toStringTag]: string;
}

// This needs to be its own interface because we want to use the `Tag` type parameter.
interface TaggedIdStatic<Tag extends string> {
	readonly prototype: TaggedId<Tag>;

	readonly tag: Tag;

	readonly from: <T extends TaggedIdStatic<Tag>>(this: T, key: string) => T["prototype"];
	readonly fromTagged: <T extends TaggedIdStatic<Tag>>(
		this: T,
		taggedKey: string,
	) => T["prototype"];

	// Suppress For.
	For: never;
}

type TaggedIdCls<Tag extends string> = typeof TaggedId<Tag> & TaggedIdStatic<Tag>;

const stringify = (key: IdValue, tag?: string): string => (tag ? `${tag}_${key}` : `${key}`);

const caches = new WeakMap<typeof Id, Map<IdValue, WeakRef<Id>>>();
const registry = new FinalizationRegistry<{ cls: typeof Id; key: IdValue }>(({ cls, key }) =>
	caches.get(cls)?.delete(key),
);

export class Id {
	readonly tag: string | undefined;
	readonly key: IdValue;

	static readonly tag: string | undefined;

	protected constructor(key: IdValue, tag?: string) {
		this.key = key;
		this.tag = tag;
	}

	static from<T extends typeof Id>(this: T, key: IdValue, tag?: string): T["prototype"] {
		// We don't need the tag as part of the cache key when the class has a
		// tag, since it's the same for all instances of the class.  Also, in this
		// case we intentionally ignore everything but the first argument so that
		// you can safely write `[].map(UserId.from)`.
		const cacheKey = this.tag ? key : stringify(key, tag);
		let cache = caches.get(this);
		if (!cache) {
			caches.set(this, (cache = new Map()));
		}

		const cached = cache.get(cacheKey)?.deref() as T["prototype"] | undefined;
		if (cached) {
			return cached;
		}

		const id = new this(key, tag);
		cache.set(cacheKey, new WeakRef(id));
		registry.register(id, { cls: this, key: cacheKey });
		return id;
	}

	static fromTagged<T extends typeof Id>(this: T, taggedKey: string): T["prototype"] {
		const expectedTag = this.tag;

		// No prefix!
		if (!expectedTag) {
			return this.from(taggedKey);
		}

		const idx = taggedKey.lastIndexOf("_");

		const tag = taggedKey.slice(0, idx);
		const key = taggedKey.slice(idx + 1);

		if (tag !== expectedTag) {
			throw new InvalidTagError(taggedKey, expectedTag);
		}

		return this.from(key, tag);
	}

	static For<Tag extends string>(tag: Tag): TaggedIdCls<Tag> {
		class Cls extends this {
			static readonly tag: Tag = tag;
			override readonly tag: Tag = tag;

			// Remove the `For` method because you can't create a nested subclass for
			// a different tag.
			static For: never = undefined as never;
		}
		Object.defineProperty(Cls, "name", { value: `${this.name}<${tag}>` });
		return Cls as any;
	}

	toString(): string {
		return stringify(this.key, this.tag);
	}

	toJSON(): string {
		return this.toString();
	}

	[Symbol.for("nodejs.util.inspect.custom")](): string {
		return `${this.constructor.name}(${this.toString()})`;
	}

	toPostgres(): IdValue {
		return this.key;
	}

	get [Symbol.toStringTag](): string {
		return this.constructor.name;
	}
}
