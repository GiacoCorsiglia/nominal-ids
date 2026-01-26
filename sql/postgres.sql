-- These are just slightly modified from the original typeid implementation.
-- Thank you to them!
-- https://github.com/jetify-com/typeid-sql/blob/main/sql/02_base32.sql

create or replace function uuid_to_base32(id uuid)
returns text
language plpgsql
immutable parallel safe
as $$
declare
  bytes constant bytea = uuid_send(id);
  alphabet constant bytea = '0123456789abcdefghjkmnpqrstvwxyz';
begin
  return convert_from(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
      '\x0000000000000000000000000000000000000000000000000000'::bytea,
      0, get_byte(alphabet, (get_byte(bytes, 0) & 224) >> 5)),
      1, get_byte(alphabet, (get_byte(bytes, 0) & 31))),
      2, get_byte(alphabet, (get_byte(bytes, 1) & 248) >> 3)),
      3, get_byte(alphabet, ((get_byte(bytes, 1) & 7) << 2) | ((get_byte(bytes, 2) & 192) >> 6))),
      4, get_byte(alphabet, (get_byte(bytes, 2) & 62) >> 1)),
      5, get_byte(alphabet, ((get_byte(bytes, 2) & 1) << 4) | ((get_byte(bytes, 3) & 240) >> 4))),
      6, get_byte(alphabet, ((get_byte(bytes, 3) & 15) << 1) | ((get_byte(bytes, 4) & 128) >> 7))),
      7, get_byte(alphabet, (get_byte(bytes, 4) & 124) >> 2)),
      8, get_byte(alphabet, ((get_byte(bytes, 4) & 3) << 3) | ((get_byte(bytes, 5) & 224) >> 5))),
      9, get_byte(alphabet, (get_byte(bytes, 5) & 31))),
      10, get_byte(alphabet, (get_byte(bytes, 6) & 248) >> 3)),
      11, get_byte(alphabet, ((get_byte(bytes, 6) & 7) << 2) | ((get_byte(bytes, 7) & 192) >> 6))),
      12, get_byte(alphabet, (get_byte(bytes, 7) & 62) >> 1)),
      13, get_byte(alphabet, ((get_byte(bytes, 7) & 1) << 4) | ((get_byte(bytes, 8) & 240) >> 4))),
      14, get_byte(alphabet, ((get_byte(bytes, 8) & 15) << 1) | ((get_byte(bytes, 9) & 128) >> 7))),
      15, get_byte(alphabet, (get_byte(bytes, 9) & 124) >> 2)),
      16, get_byte(alphabet, ((get_byte(bytes, 9) & 3) << 3) | ((get_byte(bytes, 10) & 224) >> 5))),
      17, get_byte(alphabet, (get_byte(bytes, 10) & 31))),
      18, get_byte(alphabet, (get_byte(bytes, 11) & 248) >> 3)),
      19, get_byte(alphabet, ((get_byte(bytes, 11) & 7) << 2) | ((get_byte(bytes, 12) & 192) >> 6))),
      20, get_byte(alphabet, (get_byte(bytes, 12) & 62) >> 1)),
      21, get_byte(alphabet, ((get_byte(bytes, 12) & 1) << 4) | ((get_byte(bytes, 13) & 240) >> 4))),
      22, get_byte(alphabet, ((get_byte(bytes, 13) & 15) << 1) | ((get_byte(bytes, 14) & 128) >> 7))),
      23, get_byte(alphabet, (get_byte(bytes, 14) & 124) >> 2)),
      24, get_byte(alphabet, ((get_byte(bytes, 14) & 3) << 3) | ((get_byte(bytes, 15) & 224) >> 5))),
      25, get_byte(alphabet, (get_byte(bytes, 15) & 31))),
    'UTF8'
  );
end
$$;


create or replace function base32_to_uuid(s text)
returns uuid
language plpgsql
immutable parallel safe
as $$
declare
  dec constant bytea = '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF 00 01'::bytea ||
              '\x02 03 04 05 06 07 08 09 FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF 0A 0B 0C'::bytea ||
              '\x0D 0E 0F 10 11 FF 12 13 FF 14'::bytea ||
              '\x15 FF 16 17 18 19 1A FF 1B 1C'::bytea ||
              '\x1D 1E 1F FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF FF FF FF FF'::bytea ||
              '\xFF FF FF FF FF FF'::bytea;
  s_lower constant text = lower(s);
  v constant bytea = convert_to(s_lower, 'UTF8');
begin
  if length(s_lower) <> 26 then
    raise exception 'base32 UUIDs must must be 26 characters';
  end if;

  if substring(s_lower, 1, 1) > '7' then
    raise exception 'base 32 UUIDs must start with 0-7';
  end if;

  if (get_byte(dec, get_byte(v, 0)) | get_byte(dec, get_byte(v, 1)) | get_byte(dec, get_byte(v, 2)) |
      get_byte(dec, get_byte(v, 3)) | get_byte(dec, get_byte(v, 4)) | get_byte(dec, get_byte(v, 5)) |
      get_byte(dec, get_byte(v, 6)) | get_byte(dec, get_byte(v, 7)) | get_byte(dec, get_byte(v, 8)) |
      get_byte(dec, get_byte(v, 9)) | get_byte(dec, get_byte(v, 10)) | get_byte(dec, get_byte(v, 11)) |
      get_byte(dec, get_byte(v, 12)) | get_byte(dec, get_byte(v, 13)) | get_byte(dec, get_byte(v, 14)) |
      get_byte(dec, get_byte(v, 15)) | get_byte(dec, get_byte(v, 16)) | get_byte(dec, get_byte(v, 17)) |
      get_byte(dec, get_byte(v, 18)) | get_byte(dec, get_byte(v, 19)) | get_byte(dec, get_byte(v, 20)) |
      get_byte(dec, get_byte(v, 21)) | get_byte(dec, get_byte(v, 22)) | get_byte(dec, get_byte(v, 23)) |
      get_byte(dec, get_byte(v, 24)) | get_byte(dec, get_byte(v, 25))) = 255
  then
    raise exception 'base32 UUIDs must only use characters from the base32 alphabet';
  end if;

  return encode(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
    set_byte(
      '\x00000000000000000000000000000000'::bytea,
      0, (get_byte(dec, get_byte(v, 0)) << 5) | get_byte(dec, get_byte(v, 1))),
      1, (get_byte(dec, get_byte(v, 2)) << 3) | (get_byte(dec, get_byte(v, 3)) >> 2)),
      2, ((get_byte(dec, get_byte(v, 3)) & 3) << 6) | (get_byte(dec, get_byte(v, 4)) << 1) | (get_byte(dec, get_byte(v, 5)) >> 4)),
      3, ((get_byte(dec, get_byte(v, 5)) & 15) << 4) | (get_byte(dec, get_byte(v, 6)) >> 1)),
      4, ((get_byte(dec, get_byte(v, 6)) & 1) << 7) | (get_byte(dec, get_byte(v, 7)) << 2) | (get_byte(dec, get_byte(v, 8)) >> 3)),
      5, ((get_byte(dec, get_byte(v, 8)) & 7) << 5) | get_byte(dec, get_byte(v, 9))),
      6, (get_byte(dec, get_byte(v, 10)) << 3) | (get_byte(dec, get_byte(v, 11)) >> 2)),
      7, ((get_byte(dec, get_byte(v, 11)) & 3) << 6) | (get_byte(dec, get_byte(v, 12)) << 1) | (get_byte(dec, get_byte(v, 13)) >> 4)),
      8, ((get_byte(dec, get_byte(v, 13)) & 15) << 4) | (get_byte(dec, get_byte(v, 14)) >> 1)),
      9, ((get_byte(dec, get_byte(v, 14)) & 1) << 7) | (get_byte(dec, get_byte(v, 15)) << 2) | (get_byte(dec, get_byte(v, 16)) >> 3)),
      10, ((get_byte(dec, get_byte(v, 16)) & 7) << 5) | get_byte(dec, get_byte(v, 17))),
      11, (get_byte(dec, get_byte(v, 18)) << 3) | (get_byte(dec, get_byte(v, 19)) >> 2)),
      12, ((get_byte(dec, get_byte(v, 19)) & 3) << 6) | (get_byte(dec, get_byte(v, 20)) << 1) | (get_byte(dec, get_byte(v, 21)) >> 4)),
      13, ((get_byte(dec, get_byte(v, 21)) & 15) << 4) | (get_byte(dec, get_byte(v, 22)) >> 1)),
      14, ((get_byte(dec, get_byte(v, 22)) & 1) << 7) | (get_byte(dec, get_byte(v, 23)) << 2) | (get_byte(dec, get_byte(v, 24)) >> 3)),
      15, ((get_byte(dec, get_byte(v, 24)) & 7) << 5) | get_byte(dec, get_byte(v, 25))),
    'hex'
  )::uuid;
end
$$;
