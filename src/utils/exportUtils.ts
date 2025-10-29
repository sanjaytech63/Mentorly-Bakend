export const exportToCSV = (data: any[], columns: { key: string; header: string }[]): string => {
  const headers = columns.map(col => col.header).join(',');

  const rows = data
    .map(item => {
      return columns
        .map(col => {
          const value = item[col.key];
          if (value instanceof Date) {
            return `"${value.toISOString()}"`;
          }
          return `"${String(value || '').replace(/"/g, '""')}"`;
        })
        .join(',');
    })
    .join('\n');

  return `${headers}\n${rows}`;
};
