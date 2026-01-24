import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Navigation utilities for next-intl
 * Provides locale-aware Link, redirect, usePathname, and useRouter
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
