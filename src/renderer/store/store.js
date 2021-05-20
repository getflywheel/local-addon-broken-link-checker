import { configureStore } from '@reduxjs/toolkit';
import { scanSlice } from './scanSlice';

/**
 * Convenience collection of Redux actions.
 */

export const actions = {
	...scanSlice.actions,
};

/**
 * The Redux store.
 */
export const store = configureStore({
	reducer: {
		scan: scanSlice.reducer,
	},
});
