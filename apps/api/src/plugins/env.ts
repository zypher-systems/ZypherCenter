import fp from 'fastify-plugin'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'

const EnvSchema = z.object({
  /**
   * Optional pre-configured Proxmox host. When set, it is used as the default
   * on the login page and users don't need to type it. When absent, users must
   * supply it on the login form.
   */
  PROXMOX_HOST: z.string().url().optional(),
  PROXMOX_TLS_VERIFY: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v !== 'false'),
  /**
   * Optional session secret. If not supplied a random 32-byte secret is
   * generated at startup — sessions will be invalidated on container restart,
   * which is fine for local/test usage.
   */
  SESSION_SECRET: z.string().optional(),
  /**
   * Set to "true" only when serving over HTTPS. Defaults to false so that
   * plain HTTP Docker deployments (the common case) work without extra config.
   */
  COOKIE_SECURE: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true'),
  API_PORT: z.string().optional().default('3001').transform(Number),
  CORS_ORIGIN: z.string().optional().default('http://localhost:5173'),
  LOG_LEVEL: z.string().optional().default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
})

type EnvParsed = z.infer<typeof EnvSchema>
export type Config = Omit<EnvParsed, 'SESSION_SECRET'> & { SESSION_SECRET: string }

declare module 'fastify' {
  interface FastifyInstance {
    config: Config
  }
}

export const envPlugin = fp(
  async (fastify) => {
    const result = EnvSchema.safeParse(process.env)

    if (!result.success) {
      fastify.log.error('❌ Invalid environment configuration:')
      for (const [field, errors] of Object.entries(result.error.flatten().fieldErrors)) {
        fastify.log.error(`  ${field}: ${(errors as string[]).join(', ')}`)
      }
      process.exit(1)
    }

    const env = result.data

    let sessionSecret = env.SESSION_SECRET
    if (!sessionSecret) {
      sessionSecret = randomBytes(32).toString('hex')
      fastify.log.warn(
        'SESSION_SECRET not set — using an auto-generated secret. ' +
          'Sessions will be invalidated on restart. ' +
          'Set SESSION_SECRET for persistent sessions.',
      )
    }

    fastify.decorate('config', { ...env, SESSION_SECRET: sessionSecret })
  },
  { name: 'env' },
)
