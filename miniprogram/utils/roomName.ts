export function formatDefaultRoomName(dateInput?: string | number | Date) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const month = validDate.getMonth() + 1;
  const day = validDate.getDate();
  const hour = validDate.getHours();
  const period = hour < 12 ? '上午' : '下午';
  const displayHour = hour % 12 || 12;

  return `${month}月${day}日${period}${displayHour}点`;
}
