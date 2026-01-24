/**
 * Type-safe Redux hooks
 */

import { useDispatch, useSelector, useStore } from 'react-redux';
import type { AppDispatch, RootState, AppStore } from './index';

/**
 * Type-safe useDispatch hook
 * Use this instead of plain useDispatch
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * Type-safe useSelector hook
 * Use this instead of plain useSelector
 */
export const useAppSelector = useSelector.withTypes<RootState>();

/**
 * Type-safe useStore hook
 * Use this instead of plain useStore
 */
export const useAppStore = useStore.withTypes<AppStore>();
