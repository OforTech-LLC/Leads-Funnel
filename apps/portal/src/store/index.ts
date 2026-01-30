import { configureStore } from '@reduxjs/toolkit';
import portalUiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    portalUi: portalUiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
