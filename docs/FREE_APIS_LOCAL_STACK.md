# Free APIs and local-first stack for InternFlow

Use this when building locally without Huawei services.

## Recommended local-first defaults

- `LOCAL_DEV_MODE=true`
- `STORAGE_PROVIDER=minio`
- `REDIS_URL=redis://localhost:6379`
- `SMTP_HOST=localhost` + `SMTP_PORT=1025` (MailHog)

## Free APIs you can add immediately

1. **OpenRouter free models** (LLM text extraction / assistant prompts)
   - Free tier options are available depending on model and usage.
   - Good for CV parsing fallback and chatbot intelligence.

2. **Groq API (free developer tier)**
   - Fast inference for assistant-style responses.
   - Useful for WhatsApp intent classification and smart replies.

3. **Hugging Face Inference API (free tier)**
   - Can be used for embeddings, text classification, and extraction helpers.

4. **Resend / MailerSend free tiers**
   - Replace local SMTP for hosted test environments while keeping low cost.

5. **Cloudinary free tier**
   - Optional media/doc preview transformations if needed.

## Integration principle

Keep every integration optional behind env flags:

- If API key is missing, fallback to local behavior.
- Never block profile save/onboarding because an external API is unavailable.
- Always log warning + keep core student flow operational.
