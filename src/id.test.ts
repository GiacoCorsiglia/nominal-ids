import assert from "node:assert/strict";
import { test } from "node:test";

import { Id } from "./id.ts";

class SubClass extends Id {}
class UserId extends Id.For("user") {}
class PostId extends Id.For("post") {}

test("UserId constructor is protected by TypeScript", () => {
	// @ts-expect-error - constructor is not accessible
	new UserId("123", "user");

	const UserId2 = Id.For("user");
	// @ts-expect-error - constructor is not accessible
	new UserId2("123", "user");
});

test("UserId.from expects string", () => {
	// @ts-expect-error - number is not allowed
	UserId.from(123);
	// @ts-expect-error - bigint is not allowed
	UserId.from(9007199254740993n);
});

test("UserId.For is protected by TypeScript", () => {
	// @ts-expect-error - For is not accessible
	UserId.For?.("user");
});

test("UserId.tag is set (static)", () => {
	assert.equal(UserId.tag, "user");
});

test("userId.tag is set (instance)", () => {
	const userId = UserId.from("123");
	assert.equal(userId.tag, "user");
});

test("untagged subclass", () => {
	class Fresh extends Id {}
	assert.equal(Fresh.from("123"), Fresh.from("123"));
});

test("interns same tag+value to same instance", () => {
	const a = Id.from("123", "user");
	const b = Id.from("123", "user");
	assert.equal(a, b);
});

test("different tag returns different instance", () => {
	const a = Id.from("123", "user");
	const b = Id.from("123", "post");
	assert.notEqual(a, b);
});

test("different value returns different instance", () => {
	const a = Id.from("123", "user");
	const b = Id.from("456", "user");
	assert.notEqual(a, b);
});

test("subclasses intern same value to same instance", () => {
	const a = UserId.from("123");
	const b = UserId.from("123");
	assert.equal(a, b);
});

test("different subclasses have separate caches", () => {
	const user = UserId.from("123");
	const post = PostId.from("123");
	assert.notEqual(user, post);
	assert.equal(user.tag, "user");
	assert.equal(post.tag, "post");
});

test("Id.For sets generated class name", () => {
	const AnonId = Id.For("anon");
	assert.equal(AnonId.name, "Id<anon>");
});

test("extending Id.For preserves user class name", () => {
	assert.equal(UserId.name, "UserId");
});

test("supports string, number, and bigint values", () => {
	assert.equal(Id.from("abc", "x").key, "abc");
	assert.equal(Id.from(42, "x").key, 42);
	assert.equal(Id.from(9007199254740993n, "x").key, 9007199254740993n);
});

test("toString returns tag_value", () => {
	assert.equal(Id.from("123", "user").toString(), "user_123");
});

test("toJSON returns toString for JSON.stringify", () => {
	const id = Id.from("123", "user");
	assert.equal(JSON.stringify(id), '"user_123"');
});

test("toPostgres returns raw value", () => {
	assert.equal(Id.from("123", "user").toPostgres(), "123");
});

test("Symbol.toStringTag returns constructor name", () => {
	assert.equal(Object.prototype.toString.call(Id.from("1", "x")), "[object Id]");
	assert.equal(Object.prototype.toString.call(UserId.from("1")), "[object UserId]");
});

test("instanceof Id", () => {
	assert.ok(Id.from("1", "x") instanceof Id);
	assert.ok(!(Id.from("1", "x") instanceof UserId));
	assert.ok(!(Id.from("1", "x") instanceof Id.For("test")));
	assert.ok(!(Id.from("1", "x") instanceof SubClass));
	assert.ok(SubClass.from("1") instanceof Id);
	assert.ok(UserId.from("1") instanceof Id);
	assert.ok(PostId.from("1") instanceof Id);
});

test("instanceof subclass with extends", () => {
	assert.ok(SubClass.from("1") instanceof SubClass);
	assert.ok(UserId.from("1") instanceof UserId);
	assert.ok(PostId.from("1") instanceof PostId);

	assert.ok(!(UserId.from("1") instanceof PostId));
	assert.ok(!(PostId.from("1") instanceof UserId));
	assert.ok(!(SubClass.from("1") instanceof UserId));
	assert.ok(!(SubClass.from("1") instanceof PostId));
	assert.ok(!(UserId.from("1") instanceof Id.For("test")));
	assert.ok(!(PostId.from("1") instanceof Id.For("test")));
	assert.ok(!(SubClass.from("1") instanceof Id.For("test")));
});

test("instanceof subclass with const", () => {
	const userId = UserId.from("1");
	const postId = PostId.from("1");
	assert.ok(userId instanceof UserId);
	assert.ok(postId instanceof PostId);
	assert.ok(!(userId instanceof PostId));
	assert.ok(!(postId instanceof UserId));
});

test("each Id.For call creates a distinct class", () => {
	const UserA = Id.For("user");
	const UserB = Id.For("user");
	assert.notStrictEqual(UserA, UserB);
	assert.ok(!(UserA.from("1") instanceof UserB));
});
