# Storage Patterns (Next.js)

S3-compatible storage in supastarter Next.js. Official recipes for:

- **AWS S3** — <https://supastarter.dev/docs/nextjs/storage/aws-s3>
- **Cloudflare R2** — <https://supastarter.dev/docs/nextjs/storage/cloudflare-r2>
- **DigitalOcean Spaces** — <https://supastarter.dev/docs/nextjs/storage/digitalocean-spaces>
- **Supabase Storage** (S3 protocol) — see [supabase-setup.md](supabase-setup.md)
- **MinIO** (local dev) — bundled in `docker-compose.yml`
- **UploadThing** (alternative; not S3-compat) — <https://supastarter.dev/docs/nextjs/storage/uploadthing>

## Layout

```
packages/storage/
  provider/        # S3 client implementations
  config.ts        # bucket / endpoint config
  types.ts
  index.ts
```

## Env

```env
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=
S3_REGION=
NEXT_PUBLIC_AVATARS_BUCKET_NAME="avatars"
```

### Local (MinIO via docker-compose)

The bundled `docker-compose.yml` runs MinIO and a setup container that creates the `avatars` bucket with public download access.

```env
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
```

MinIO console: http://localhost:9001 (`minioadmin` / `minioadmin`).

### Supabase Storage

Create a private bucket named `avatars` in the Supabase dashboard, then in Project Settings → Storage → S3 access keys generate credentials.

```env
S3_ACCESS_KEY_ID="<from supabase>"
S3_SECRET_ACCESS_KEY="<from supabase>"
S3_ENDPOINT="https://<project-ref>.supabase.co/storage/v1/s3"
S3_REGION="us-east-1"   # required by AWS SDK; Supabase ignores it
NEXT_PUBLIC_AVATARS_BUCKET_NAME="avatars"
```

Keep the bucket **private** — access control happens at the API/image-proxy layer. See [supabase-setup.md](supabase-setup.md) for full setup.

### AWS S3 / Cloudflare R2

Standard S3 settings. For R2, set `S3_ENDPOINT` to your account-specific R2 endpoint and use auto-region.

## Uploads

Standard pattern — **presigned URLs**:

1. Client calls a procedure (e.g., `users.getAvatarUploadUrl`) to request a presigned PUT URL.
2. Client `PUT`s the file directly to S3 / Supabase / MinIO.
3. Client confirms via another procedure to update the DB record (e.g., `user.image`).

For private buckets, also generate presigned GET URLs to read.

## Image proxy

`apps/saas/app/image-proxy/[...path]/route.ts` proxies S3 images through the Next.js server (auth, caching, CORS, transforms). Use it when serving private bucket content.

## Buckets

Add new buckets:

1. Local: extend `docker-compose.yml` `minio-setup` to create the bucket on startup.
2. Add an env var like `NEXT_PUBLIC_<NAME>_BUCKET_NAME`.
3. Configure access policy in `packages/storage/provider/`.
4. Production: create the bucket on your provider with the right policy.

## Docs

- [Storage overview](https://supastarter.dev/docs/nextjs/storage/overview)
- [Setup / connect](https://supastarter.dev/docs/nextjs/storage/setup)
- [Upload files](https://supastarter.dev/docs/nextjs/storage/upload-files)
- [Access files](https://supastarter.dev/docs/nextjs/storage/access-files)
- [Supabase setup recipe](supabase-setup.md)
- AWS SDK v3: <https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html>
