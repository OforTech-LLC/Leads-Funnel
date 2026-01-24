/**
 * Redux store configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import leadReducer from './leadSlice';

/**
 * Create and configure the Redux store
 */
export const makeStore = () => {
  return configureStore({
    reducer: {
      lead: leadReducer,
    },
    // Enable Redux DevTools in development
    devTools: process.env.NODE_ENV !== 'production',
  });
};

// Store type
export type AppStore = ReturnType<typeof makeStore>;

// Root state type
export type RootState = ReturnType<AppStore['getState']>;

// Dispatch type
export type AppDispatch = AppStore['dispatch'];
