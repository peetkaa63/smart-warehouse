import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MapFocusTarget {
  zone: string;
  row: number;
  shelf: number;
}

interface MapFocusState {
  target: MapFocusTarget | null;
  updatedAt: number | null;
}

const initialState: MapFocusState = {
  target: null,
  updatedAt: null
};

const mapFocusSlice = createSlice({
  name: 'mapFocus',
  initialState,
  reducers: {
    setMapFocus: (state, action: PayloadAction<MapFocusTarget>) => {
      state.target = action.payload;
      state.updatedAt = Date.now();
    },
    clearMapFocus: (state) => {
      state.target = null;
      state.updatedAt = null;
    }
  }
});

export const { setMapFocus, clearMapFocus } = mapFocusSlice.actions;
export default mapFocusSlice.reducer;

