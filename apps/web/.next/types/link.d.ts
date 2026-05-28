// Type definitions for Next.js routes

/**
 * Internal types used by the Next.js router and Link component.
 * These types are not meant to be used directly.
 * @internal
 */
declare namespace __next_route_internal_types__ {
  type SearchOrHash = `?${string}` | `#${string}`
  type WithProtocol = `${string}:${string}`

  type Suffix = '' | SearchOrHash

  type SafeSlug<S extends string> = S extends `${string}/${string}`
    ? never
    : S extends `${string}${SearchOrHash}`
    ? never
    : S extends ''
    ? never
    : S

  type CatchAllSlug<S extends string> = S extends `${string}${SearchOrHash}`
    ? never
    : S extends ''
    ? never
    : S

  type OptionalCatchAllSlug<S extends string> =
    S extends `${string}${SearchOrHash}` ? never : S

  type StaticRoutes = 
    | `/`
    | `/api/ai/chatbot`
    | `/api/ai/summary`
    | `/api/explore/posts`
    | `/api/auth/demo-login`
    | `/api/auth/otp`
    | `/api/auth/otp/verify`
    | `/api/auth/student-signup`
    | `/api/auth/join`
    | `/api/auth/logout`
    | `/api/hq/meetings`
    | `/api/hq/observability/export`
    | `/api/hq/settings`
    | `/api/hq/users`
    | `/api/documents/upload`
    | `/api/logbook`
    | `/api/logbook/approve`
    | `/api/onboarding/create-org`
    | `/api/onboarding/verify-org`
    | `/api/org/setup`
    | `/api/student/profile-quick`
    | `/api/student/upload-required`
    | `/api/public/contact`
    | `/api/tenant/students`
    | `/api/tickets/summary`
    | `/api/student-profile`
    | `/api/student-profile/cv-parse`
    | `/api/workspaces/select`
    | `/api/whatsapp/messages`
    | `/about`
    | `/demo`
    | `/contact`
    | `/explore`
    | `/how-it-works`
    | `/app`
    | `/app/coordinator`
    | `/app/provider`
    | `/app/tickets`
    | `/app/student`
    | `/app/student/documents`
    | `/app/student/profile`
    | `/app/student/profile/edit`
    | `/app/supervisor`
    | `/app/whatsapp-sim`
    | `/auth`
    | `/auth/login`
    | `/auth/setup`
    | `/hq`
    | `/hq/approvals`
    | `/hq/dashboard`
    | `/hq/meetings`
    | `/hq/settings`
    | `/hq/support`
    | `/hq/observability`
    | `/hq/tenants`
    | `/hq/users`
    | `/opportunities`
    | `/platform-admin`
    | `/register-organization`
    | `/onboarding`
    | `/onboarding/create-org`
    | `/onboarding/profile`
    | `/onboarding/verify-org`
    | `/platform`
    | `/security`
    | `/pricing`
    | `/solutions`
    | `/tenant/students`
    | `/student-sign-up`
    | `/workspaces`
  type DynamicRoutes<T extends string = string> = 
    | `/api/checklist/items/${SafeSlug<T>}/complete`
    | `/api/enrollments/${SafeSlug<T>}/status`
    | `/api/enrollments/${SafeSlug<T>}/stipend`
    | `/api/auth/${CatchAllSlug<T>}`
    | `/api/exports/${SafeSlug<T>}/download`
    | `/api/applications/${SafeSlug<T>}/status`
    | `/api/applications/${SafeSlug<T>}/placement`
    | `/api/hq/impersonate/${SafeSlug<T>}`
    | `/api/hq/approvals/${SafeSlug<T>}`
    | `/api/hq/meetings/${SafeSlug<T>}/remind`
    | `/api/hq/support/${SafeSlug<T>}/action`
    | `/api/opportunities/${SafeSlug<T>}/apply`
    | `/api/org/${SafeSlug<T>}/certificates/issue`
    | `/api/org/${SafeSlug<T>}/certificates/${SafeSlug<T>}/download`
    | `/api/org/${SafeSlug<T>}/certificates/policy`
    | `/api/org/${SafeSlug<T>}/cost-capture`
    | `/api/org/${SafeSlug<T>}/cost-capture/evidence/${SafeSlug<T>}`
    | `/api/org/${SafeSlug<T>}/documents/${SafeSlug<T>}/ocr`
    | `/api/org/${SafeSlug<T>}/documents/${SafeSlug<T>}/review`
    | `/api/org/${SafeSlug<T>}/documents/${SafeSlug<T>}/download`
    | `/api/org/${SafeSlug<T>}/exports/${SafeSlug<T>}`
    | `/api/org/${SafeSlug<T>}/exports/closeout`
    | `/api/org/${SafeSlug<T>}/exports/closeout/download`
    | `/api/org/${SafeSlug<T>}/exports/foundation`
    | `/api/org/${SafeSlug<T>}/follow-ups`
    | `/api/org/${SafeSlug<T>}/learner-chat`
    | `/api/org/${SafeSlug<T>}/logbooks/${SafeSlug<T>}/approval`
    | `/api/org/${SafeSlug<T>}/notifications`
    | `/api/org/${SafeSlug<T>}/opportunities`
    | `/api/org/${SafeSlug<T>}/programs`
    | `/api/org/${SafeSlug<T>}/registers`
    | `/api/org/${SafeSlug<T>}/registers/${SafeSlug<T>}`
    | `/api/org/${SafeSlug<T>}/opportunity-posts`
    | `/api/org/${SafeSlug<T>}/settings`
    | `/api/org/${SafeSlug<T>}/staff/invite`
    | `/api/org/${SafeSlug<T>}/student-invites`
    | `/api/org/${SafeSlug<T>}/student-invites/${SafeSlug<T>}/revoke`
    | `/api/org/${SafeSlug<T>}/template-library/${SafeSlug<T>}`
    | `/api/org/${SafeSlug<T>}/templates`
    | `/api/opportunity-posts/${SafeSlug<T>}/interest`
    | `/api/platform/orgs/${SafeSlug<T>}/decision`
    | `/hq/tenants/${SafeSlug<T>}`
    | `/org/${SafeSlug<T>}`
    | `/org/${SafeSlug<T>}/app`
    | `/org/${SafeSlug<T>}/app/applicants`
    | `/org/${SafeSlug<T>}/app/approvals`
    | `/org/${SafeSlug<T>}/app/certificates`
    | `/org/${SafeSlug<T>}/app/certificates/preview`
    | `/org/${SafeSlug<T>}/app/costs`
    | `/org/${SafeSlug<T>}/app/dashboard`
    | `/org/${SafeSlug<T>}/app/documents`
    | `/org/${SafeSlug<T>}/app/enrollments`
    | `/org/${SafeSlug<T>}/app/follow-ups`
    | `/org/${SafeSlug<T>}/app/intakes`
    | `/org/${SafeSlug<T>}/app/learner-chat`
    | `/org/${SafeSlug<T>}/app/learners`
    | `/org/${SafeSlug<T>}/app/learners/${SafeSlug<T>}`
    | `/org/${SafeSlug<T>}/app/logbooks`
    | `/org/${SafeSlug<T>}/app/opportunities`
    | `/org/${SafeSlug<T>}/app/opportunities/${SafeSlug<T>}`
    | `/org/${SafeSlug<T>}/app/programs`
    | `/org/${SafeSlug<T>}/app/programs/${SafeSlug<T>}`
    | `/org/${SafeSlug<T>}/app/notifications`
    | `/org/${SafeSlug<T>}/app/progress`
    | `/org/${SafeSlug<T>}/app/registers`
    | `/org/${SafeSlug<T>}/app/reports`
    | `/org/${SafeSlug<T>}/app/reports/exports`
    | `/org/${SafeSlug<T>}/app/staff`
    | `/org/${SafeSlug<T>}/app/settings`
    | `/org/${SafeSlug<T>}/student`
    | `/org/${SafeSlug<T>}/app/stipends`
    | `/org/${SafeSlug<T>}/app/templates`
    | `/org/${SafeSlug<T>}/app/templates/library`
    | `/org/${SafeSlug<T>}/coordinator`
    | `/org/${SafeSlug<T>}/dashboard`
    | `/org/${SafeSlug<T>}/home`
    | `/org/${SafeSlug<T>}/login`
    | `/org/${SafeSlug<T>}/provider-admin`
    | `/org/${SafeSlug<T>}/supervisor`
    | `/opportunities/${SafeSlug<T>}/${SafeSlug<T>}`
    | `/workspaces/open/${SafeSlug<T>}`

  type RouteImpl<T> = 
    | StaticRoutes
    | SearchOrHash
    | WithProtocol
    | `${StaticRoutes}${SearchOrHash}`
    | (T extends `${DynamicRoutes<infer _>}${Suffix}` ? T : never)
    
}

declare module 'next' {
  export { default } from 'next/types/index.js'
  export * from 'next/types/index.js'

  export type Route<T extends string = string> =
    __next_route_internal_types__.RouteImpl<T>
}

declare module 'next/link' {
  import type { LinkProps as OriginalLinkProps } from 'next/dist/client/link.js'
  import type { AnchorHTMLAttributes, DetailedHTMLProps } from 'react'
  import type { UrlObject } from 'url'

  type LinkRestProps = Omit<
    Omit<
      DetailedHTMLProps<
        AnchorHTMLAttributes<HTMLAnchorElement>,
        HTMLAnchorElement
      >,
      keyof OriginalLinkProps
    > &
      OriginalLinkProps,
    'href'
  >

  export type LinkProps<RouteInferType> = LinkRestProps & {
    /**
     * The path or URL to navigate to. This is the only required prop. It can also be an object.
     * @see https://nextjs.org/docs/api-reference/next/link
     */
    href: __next_route_internal_types__.RouteImpl<RouteInferType> | UrlObject
  }

  export default function Link<RouteType>(props: LinkProps<RouteType>): JSX.Element
}

declare module 'next/navigation' {
  export * from 'next/dist/client/components/navigation.js'

  import type { NavigateOptions, AppRouterInstance as OriginalAppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime.js'
  interface AppRouterInstance extends OriginalAppRouterInstance {
    /**
     * Navigate to the provided href.
     * Pushes a new history entry.
     */
    push<RouteType>(href: __next_route_internal_types__.RouteImpl<RouteType>, options?: NavigateOptions): void
    /**
     * Navigate to the provided href.
     * Replaces the current history entry.
     */
    replace<RouteType>(href: __next_route_internal_types__.RouteImpl<RouteType>, options?: NavigateOptions): void
    /**
     * Prefetch the provided href.
     */
    prefetch<RouteType>(href: __next_route_internal_types__.RouteImpl<RouteType>): void
  }

  export declare function useRouter(): AppRouterInstance;
}
