import { createSlice } from '@reduxjs/toolkit';

/**
 * State for the scanning site.
 */
export const scanSlice = createSlice({
	name: 'scan',
	initialState: {
		/** The site currently running a scan (else 'null' if none running) **/
		siteId: null,
	},
	reducers: {
		updateSiteId: (state, { payload }) => {
			state.siteId = payload;
		},
	},
});
