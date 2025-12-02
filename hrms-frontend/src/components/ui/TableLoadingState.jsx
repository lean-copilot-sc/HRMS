import { Box, CircularProgress, TableCell, TableRow } from '@mui/material';

export default function TableLoadingState({ loading, hasData, colSpan, emptyMessage }) {
  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} align="center">
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        </TableCell>
      </TableRow>
    );
  }

  if (!hasData) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} align="center">
          {emptyMessage}
        </TableCell>
      </TableRow>
    );
  }

  return null;
}
