import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { RouterProvider } from 'react-router-dom'

import { AuthProvider } from '@/auth/AuthProvider.tsx'
import { SmoothScroll } from '@/components/motion/SmoothScroll.tsx'
import { queryClient } from '@/lib/queryClient.ts'
import { router } from '@/routes/router.tsx'
import './index.css'

/**
 * Provider order matters: `AuthProvider` clears the query cache on sign-out, so
 * it has to sit inside `QueryClientProvider` to reach the client.
 *
 * `MotionConfig reducedMotion="user"` is the app-wide backstop for Framer
 * Motion: under the OS "reduce motion" setting, every transform and layout
 * animation settles instantly, even in a component that forgot to check.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <SmoothScroll router={router}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </QueryClientProvider>
      </SmoothScroll>
    </MotionConfig>
  </StrictMode>,
)
