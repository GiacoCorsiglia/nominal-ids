# Nominal IDs

Type-safe, tagged identifier classes with automatic interning for TypeScript.

## Installation

```bash
npm install nominal-ids
```

## Classes

### `Id`

A generic identifier class that supports optional tagging for type safety. Identifiers can be strings, numbers, or bigints.

```typescript
import { Id } from 'nominal-ids';

// Create a tagged ID class
class UserId extends Id.For("user") {}
class PostId extends Id.For("post") {}

// Construct instances using from()
const user = UserId.from(123);        // UserId with key 123
const post = PostId.from("abc");      // PostId with key "abc"

// IDs are automatically tagged
user.toString();   // "user_123"
post.toString();   // "post_abc"

// Type safety prevents mixing IDs
function getUser(id: UserId) { /* ... */ }
getUser(user);  // OK
getUser(post);  // Type error!
```

### `Uuid`

A UUID-specific identifier class that supports both hexadecimal and base32 (Crockford) representations.  The prefixed, base32 representation is inspired by [typeid](https://github.com/jetify-com/typeid), although it is not guaranteed to be a typeid because `Uuid` does not require UUIDv7, and no length limits are imposed on the prefix.

```typescript
import { Uuid } from 'nominal-ids';

// Create a tagged UUID class
class SessionId extends Uuid.For("session") {}

// Accepts hex (with hyphens) or base32 format
const session1 = SessionId.from("0188bac7-a64e-7a51-843c-441ad1d9cbc6");
const session2 = SessionId.from("0c4bsevmp7a8621fq6tjgpr6");

// Different representations
session1.toHex();      // "0188bac7-a64e-7a51-843c-441ad1d9cbc6"
session1.toBase32();   // "0c4bsevmp7a8621fq6tjgpr6"
session1.toString();   // "session_0c4bsevmp7a8621fq6tjgpr6"
```

### `uuidToBase32` / `base32ToUuid` / `isBase32Uuid`

Standalone functions for working with UUID formats without creating an interned `Uuid` instance:

```typescript
import { uuidToBase32, base32ToUuid, isBase32Uuid } from 'nominal-ids';

uuidToBase32("0188bac7-a64e-7a51-843c-441ad1d9cbc6");  // "01h2xcf9jef98r8f243b8xkjy6"
base32ToUuid("01h2xcf9jef98r8f243b8xkjy6");             // "0188bac7-a64e-7a51-843c-441ad1d9cbc6"

isBase32Uuid("01h2xcf9jef98r8f243b8xkjy6");             // true
isBase32Uuid("0188bac7-a64e-7a51-843c-441ad1d9cbc6");   // false
isBase32Uuid("not-a-uuid");                              // false
```

## Key Features

### Automatic Interning

Both `Id` and `Uuid` automatically intern instances. Creating an ID with the same key returns the same object instance:

```typescript
const id1 = UserId.from(123);
const id2 = UserId.from(123);
console.log(id1 === id2);  // true
```

This allows safe use of `===` for equality checks while maintaining memory efficiency.

### Type-Safe Tagging

The `For()` method creates a tagged subclass with compile-time type safety:

```typescript
class UserId extends Id.For("user") {}
class OrgId extends Id.For("org") {}

// Each tagged class is a distinct type
function deleteUser(id: UserId) { /* ... */ }

deleteUser(UserId.from(1));  // OK
deleteUser(OrgId.from(1));   // Type error
```

### Database Integration

The `toPostgres()` method returns the raw key without the tag prefix, suitable for database storage.  This method is automatically called by node-postgres when serializing.

```typescript
class UserId extends Id.For("user") {}
const userId = UserId.from(42);

userId.toString();      // "user_42"
userId.toPostgres();    // 42
```

For UUIDs, `toPostgres()` returns the hyphenated hex format:

```typescript
class SessionId extends Uuid.For("session") {}
const session = SessionId.from("0c4bsevmp7a8621fq6tjgpr6");

session.toPostgres();   // "0188bac7-a64e-7a51-843c-441ad1d9cbc6"
```

### Parsing Tagged Keys

Use `fromTagged()` to parse a string that includes the tag prefix:

```typescript
const userId = UserId.fromTagged("user_123");  // OK
const invalid = UserId.fromTagged("post_123"); // InvalidTagError
```
