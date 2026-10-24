export const shuffle = <T,>(items: readonly T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const healthy = ['Trà thảo mộc', 'Kombucha', 'Sinh tố trái cây', 'Sữa hạt', 'Nước detox', 'Nước ép cần tây', 'Trà hoa cúc', 'Nước đậu đen rang', 'Nước dừa', 'Nước khoáng', 'Sữa yến mạch thuần chay', 'Trà đen nguyên chất', 'Trà gừng', 'Nước ép cà chua nguyên chất', 'Sinh tố cải xoăn bina'];
export const sugary = ['Trà sữa', 'Trà trái cây', 'Matcha', 'Cà phê sữa', 'Sữa tươi trân châu đường đen', 'Trà xoài', 'Cacao sữa', 'Nước tăng lực', 'Nước ngọt', 'Nước sấu ngâm đường', 'Nước mơ ngâm đường', 'Milo dầm', 'Sữa lắc dâu tây', 'Trà thái đỏ', 'Nước cam ép đóng hộp'];
export const pairs = [ ['Trà sữa trân châu full đường', '11–12 muỗng'], ['Cà phê sữa đá pha phin', '6–7 muỗng'], ['Nước ngọt có ga (330ml)', '8–9 muỗng'], ['Nước ép cam đóng hộp', 'Khoảng 7 muỗng'], ['Trà đào 30% đường', '2–3 muỗng'] ];
export const cases = [
  { title: 'Chiêu bài ngụy trang', statement: 'Uống nước ép cam đóng hộp có ghi “100% nguyên chất” thì healthy và ít đường hơn nước ngọt có ga.', fact: false, explanation: 'Nước ép ít chất xơ vẫn chứa đường tự do. Tùy sản phẩm và khẩu phần, lượng đường có thể ngang nước ngọt (~30g). Hãy kiểm tra nhãn dinh dưỡng.' },
  { title: 'Bẫy topping', statement: 'Đi trà sữa chọn mức 0% đường thì ly nước đó chắc chắn không làm mình nạp thêm tí đường nào.', fact: false, explanation: '0% đường thường chỉ là phần đường thêm vào trà. Trân châu, thạch và pudding có thể chứa đường; tùy khẩu phần, topping có thể thêm 20–30g đường.' },
  { title: 'Tiêu chuẩn sức khỏe', statement: 'WHO khuyến nghị giảm đường tự do xuống dưới khoảng 25g/ngày để có thêm lợi ích sức khỏe (với chế độ 2.000 kcal).', fact: true, explanation: 'WHO khuyến nghị dưới 10% tổng năng lượng và đề xuất dưới 5% để có thêm lợi ích (~25g với 2.000 kcal). Một ly trà sữa ~55g đã vượt gấp đôi mốc 25g.' },
  { title: 'Ngộ nhận đường “lành mạnh”', statement: 'Dùng mật ong hoặc đường nâu/đường phèn thay đường trắng thì ăn uống thả ga không sợ tích mỡ hay tăng đường huyết.', fact: false, explanation: 'Mật ong và các loại đường này vẫn cung cấp đường tự do và năng lượng. Dùng quá nhiều vẫn có thể gây tăng cân và tăng đường huyết.' },
  { title: 'Lợi ích giảm nấc ngọt', statement: 'Chủ động giảm độ ngọt xuống 30% giúp giảm lượng đường nạp vào và cảm nhận rõ vị trà nguyên bản hơn.', fact: true, explanation: 'Giảm đường thêm vào giúp giảm năng lượng từ đường. Tác động lên mệt mỏi và mụn khác nhau ở mỗi người; mức 30% không bảo đảm một lượng đường cố định.' },
];
export const gameNames = ['Phân loại nhanh', 'Truy vết Mật Độ', 'Truy tìm sự thật', 'Flappy Gumi'];
