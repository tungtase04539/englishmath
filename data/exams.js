// 10 đề LUYỆN mô phỏng theo dạng IKMC (Kangaroo) lớp 6-7 & IMC.
// LƯU Ý: Đây là ĐỀ MẪU do biên soạn lại theo cấu trúc/độ khó kỳ thi, KHÔNG phải đề gốc có bản quyền.
// Bạn có thể bổ sung đề thật vào mảng này theo đúng schema bên dưới.
//
// Schema mỗi đề: { id, title, exam, grade, level, timeLimit (phút), questions: [...] }
// Schema mỗi câu: {
//   en: đề tiếng Anh, vi: dịch tiếng Việt,
//   choices: [..], answer: chỉ số đáp án đúng (bắt đầu từ 0),
//   solution: lời giải tiếng Việt, vocab: [từ khóa liên quan trong thư viện]
// }
window.EXAMS = [
  {
    id: "benjamin-1", title: "IKMC Benjamin – Đề luyện 1", exam: "IKMC / Kangaroo", grade: "Lớp 6", level: "Dễ – Trung bình", timeLimit: 30,
    questions: [
      { en: "What is the value of 2 + 3 × 4?", vi: "Giá trị của 2 + 3 × 4 là bao nhiêu?",
        choices: ["20", "14", "24", "9", "11"], answer: 1,
        solution: "Theo thứ tự phép tính, nhân trước: 3 × 4 = 12, rồi 2 + 12 = 14.", vocab: ["value", "multiply", "add"] },
      { en: "Which of these numbers is a prime number?", vi: "Số nào sau đây là số nguyên tố?",
        choices: ["9", "15", "23", "21", "25"], answer: 2,
        solution: "23 chỉ chia hết cho 1 và chính nó nên là số nguyên tố. Các số còn lại đều có ước khác.", vocab: ["prime number", "divisible"] },
      { en: "The sum of three consecutive numbers is 18. What is the largest of them?", vi: "Tổng ba số tự nhiên liên tiếp bằng 18. Số lớn nhất trong ba số là bao nhiêu?",
        choices: ["5", "6", "7", "8", "9"], answer: 2,
        solution: "Ba số liên tiếp là 5, 6, 7 (5+6+7 = 18). Số lớn nhất là 7.", vocab: ["sum", "consecutive", "maximum"] },
      { en: "A square has a perimeter of 20 cm. What is its area?", vi: "Một hình vuông có chu vi 20 cm. Diện tích của nó là bao nhiêu?",
        choices: ["16 cm²", "40 cm²", "25 cm²", "100 cm²", "20 cm²"], answer: 2,
        solution: "Chu vi 20 cm ⇒ cạnh = 20 ÷ 4 = 5 cm. Diện tích = 5 × 5 = 25 cm².", vocab: ["square", "perimeter", "area"] },
      { en: "What is 25% of 80?", vi: "25% của 80 là bao nhiêu?",
        choices: ["16", "25", "20", "40", "8"], answer: 2,
        solution: "25% = 1/4. Một phần tư của 80 là 80 ÷ 4 = 20.", vocab: ["percentage", "calculate"] },
      { en: "Anna has 12 coins. She gives half of them to her brother. How many coins are remaining?", vi: "Anna có 12 đồng xu. Cô ấy cho em trai một nửa. Còn lại bao nhiêu đồng xu?",
        choices: ["4", "8", "6", "3", "12"], answer: 2,
        solution: "Một nửa của 12 là 6. Cho đi 6 thì còn lại 12 − 6 = 6.", vocab: ["coin", "half", "remaining"] },
      { en: "Each angle of an equilateral triangle is equal. How many degrees is each angle?", vi: "Mỗi góc của một tam giác đều bằng nhau. Mỗi góc bằng bao nhiêu độ?",
        choices: ["90°", "45°", "60°", "30°", "120°"], answer: 2,
        solution: "Tổng ba góc của tam giác là 180°. Tam giác đều có ba góc bằng nhau: 180 ÷ 3 = 60°.", vocab: ["equilateral triangle", "angle", "degree"] }
    ]
  },
  {
    id: "cadet-1", title: "IKMC Cadet – Đề luyện 1", exam: "IKMC / Kangaroo", grade: "Lớp 7", level: "Trung bình", timeLimit: 30,
    questions: [
      { en: "Solve the equation x + 7 = 12.", vi: "Giải phương trình x + 7 = 12.",
        choices: ["19", "5", "4", "7", "6"], answer: 1,
        solution: "x = 12 − 7 = 5.", vocab: ["equation", "solve", "variable"] },
      { en: "What is the average of 4, 8 and 6?", vi: "Trung bình cộng của 4, 8 và 6 là bao nhiêu?",
        choices: ["9", "6", "18", "4", "8"], answer: 1,
        solution: "Trung bình = (4 + 8 + 6) ÷ 3 = 18 ÷ 3 = 6.", vocab: ["average", "sum"] },
      { en: "Calculate 2³ + 3².", vi: "Tính 2³ + 3².",
        choices: ["17", "12", "13", "72", "18"], answer: 0,
        solution: "2³ = 8 và 3² = 9. Tổng là 8 + 9 = 17.", vocab: ["power", "exponent", "sum"] },
      { en: "Which number is divisible by 9?", vi: "Số nào chia hết cho 9?",
        choices: ["100", "56", "81", "47", "28"], answer: 2,
        solution: "81 = 9 × 9 nên chia hết cho 9. (Tổng chữ số 8+1 = 9 cũng chia hết cho 9.)", vocab: ["divisible", "divisor"] },
      { en: "The ratio of red to blue marbles is 2 : 3. If there are 10 marbles in total, how many are red?", vi: "Tỉ số bi đỏ và bi xanh là 2 : 3. Nếu có tất cả 10 viên bi, có bao nhiêu viên bi đỏ?",
        choices: ["6", "5", "4", "3", "2"], answer: 2,
        solution: "Tổng số phần = 2 + 3 = 5. Mỗi phần = 10 ÷ 5 = 2. Bi đỏ = 2 × 2 = 4.", vocab: ["ratio", "total"] },
      { en: "A fair dice is rolled. What is the probability of getting an even number?", vi: "Gieo một con xúc xắc cân đối. Xác suất ra số chẵn là bao nhiêu?",
        choices: ["1/3", "1/2", "1/6", "2/3", "1/4"], answer: 1,
        solution: "Số chẵn trên xúc xắc: 2, 4, 6 (3 kết quả) trên tổng 6 kết quả. Xác suất = 3/6 = 1/2.", vocab: ["dice", "probability", "even", "outcome"] }
    ]
  },
  {
    id: "kangaroo-1", title: "Kangaroo Hỗn hợp – Đề luyện 1", exam: "IKMC / Kangaroo", grade: "Lớp 6-7", level: "Trung bình", timeLimit: 25,
    questions: [
      { en: "Tom is twice as old as his sister. If his sister is 6 years old, how old is Tom?", vi: "Tom lớn gấp đôi tuổi em gái. Nếu em gái 6 tuổi thì Tom bao nhiêu tuổi?",
        choices: ["8", "12", "3", "18", "6"], answer: 1,
        solution: "Gấp đôi 6 tuổi là 2 × 6 = 12.", vocab: ["twice", "double"] },
      { en: "How many edges does a cube have?", vi: "Một khối lập phương có bao nhiêu cạnh?",
        choices: ["6", "8", "12", "4", "10"], answer: 2,
        solution: "Khối lập phương có 12 cạnh.", vocab: ["cube", "edge"] },
      { en: "What is the next number in the pattern 3, 6, 12, 24, …?", vi: "Số tiếp theo trong quy luật 3, 6, 12, 24, … là số nào?",
        choices: ["36", "48", "30", "72", "40"], answer: 1,
        solution: "Mỗi số gấp đôi số trước. 24 × 2 = 48.", vocab: ["pattern", "sequence", "double"] },
      { en: "A book costs 7 dollars. How much do 5 books cost altogether?", vi: "Một quyển sách giá 7 đô la. Năm quyển sách tổng cộng giá bao nhiêu?",
        choices: ["12", "35", "30", "40", "25"], answer: 1,
        solution: "5 × 7 = 35 đô la.", vocab: ["cost", "altogether", "multiply"] },
      { en: "Which of these is an acute angle?", vi: "Góc nào sau đây là góc nhọn?",
        choices: ["90°", "45°", "120°", "180°", "100°"], answer: 1,
        solution: "Góc nhọn là góc nhỏ hơn 90°. Chỉ 45° thỏa mãn.", vocab: ["acute angle", "angle", "degree"] },
      { en: "A car travels 60 km in 1 hour. At the same speed, how far does it travel in 3 hours?", vi: "Một ô tô đi 60 km trong 1 giờ. Với cùng vận tốc, nó đi được bao xa trong 3 giờ?",
        choices: ["120 km", "180 km", "20 km", "90 km", "240 km"], answer: 1,
        solution: "Quãng đường = vận tốc × thời gian = 60 × 3 = 180 km.", vocab: ["speed", "distance"] }
    ]
  },
  {
    id: "imc-1", title: "IMC – Đề luyện 1", exam: "IMC", grade: "Lớp 7", level: "Khá – Khó", timeLimit: 30,
    questions: [
      { en: "What is the sum of the first 5 positive even numbers?", vi: "Tổng của 5 số chẵn dương đầu tiên là bao nhiêu?",
        choices: ["30", "20", "25", "40", "15"], answer: 0,
        solution: "2 + 4 + 6 + 8 + 10 = 30.", vocab: ["sum", "even", "positive"] },
      { en: "How many factors does 12 have?", vi: "Số 12 có bao nhiêu ước?",
        choices: ["4", "6", "5", "3", "12"], answer: 1,
        solution: "Các ước của 12 là 1, 2, 3, 4, 6, 12 — tất cả 6 ước.", vocab: ["factor", "count", "divisor"] },
      { en: "A number increased by 20% becomes 60. What is the original number?", vi: "Một số tăng thêm 20% thì bằng 60. Số ban đầu là bao nhiêu?",
        choices: ["48", "50", "40", "72", "45"], answer: 1,
        solution: "Số ban đầu × 1,2 = 60 ⇒ số ban đầu = 60 ÷ 1,2 = 50.", vocab: ["increase", "percentage", "value"] },
      { en: "What is 7 × 8 − 6?", vi: "Tính 7 × 8 − 6.",
        choices: ["56", "50", "62", "48", "44"], answer: 1,
        solution: "Nhân trước: 7 × 8 = 56, rồi 56 − 6 = 50.", vocab: ["multiply", "subtract"] },
      { en: "What is the remainder when 25 is divided by 4?", vi: "Số dư khi chia 25 cho 4 là bao nhiêu?",
        choices: ["2", "1", "3", "0", "5"], answer: 1,
        solution: "25 = 4 × 6 + 1, nên số dư là 1.", vocab: ["remainder", "divide", "divisor"] }
    ]
  },
  {
    id: "benjamin-2", title: "IKMC Benjamin – Đề luyện 2", exam: "IKMC / Kangaroo", grade: "Lớp 6", level: "Dễ – Trung bình", timeLimit: 30,
    questions: [
      { en: "Round 3.7 to the nearest whole number.", vi: "Làm tròn 3,7 đến số tự nhiên gần nhất.",
        choices: ["3", "4", "5", "3.5", "4.5"], answer: 1,
        solution: "3,7 gần 4 hơn gần 3, nên làm tròn thành 4.", vocab: ["rounding", "whole number"] },
      { en: "A pizza is cut into 8 equal parts. You eat 3 parts. What fraction of the pizza remains?", vi: "Một chiếc pizza được cắt thành 8 phần bằng nhau. Bạn ăn 3 phần. Phân số phần pizza còn lại là bao nhiêu?",
        choices: ["3/8", "5/8", "1/2", "5/3", "8/5"], answer: 1,
        solution: "Ăn 3/8 thì còn lại 8/8 − 3/8 = 5/8.", vocab: ["fraction", "remaining"] },
      { en: "How many vertices does a triangle have?", vi: "Một tam giác có bao nhiêu đỉnh?",
        choices: ["4", "3", "2", "6", "1"], answer: 1,
        solution: "Tam giác có 3 đỉnh.", vocab: ["triangle", "vertex"] },
      { en: "What is 15 + 27?", vi: "Tính 15 + 27.",
        choices: ["32", "42", "41", "52", "43"], answer: 1,
        solution: "15 + 27 = 42.", vocab: ["add", "sum"] },
      { en: "Which decimal is the largest?", vi: "Số thập phân nào lớn nhất?",
        choices: ["0.45", "0.5", "0.09", "0.4", "0.49"], answer: 1,
        solution: "So sánh: 0,5 = 0,50 lớn hơn 0,49; 0,45; 0,40; 0,09. Vậy 0,5 lớn nhất.", vocab: ["decimal", "greater than", "maximum"] },
      { en: "A bag has 2 red balls and 3 green balls. What is the probability of taking a red ball?", vi: "Một túi có 2 quả bóng đỏ và 3 quả bóng xanh. Xác suất lấy được bóng đỏ là bao nhiêu?",
        choices: ["3/5", "2/5", "1/2", "2/3", "1/5"], answer: 1,
        solution: "Có 2 bóng đỏ trên tổng 5 bóng. Xác suất = 2/5.", vocab: ["probability", "chance"] },
      { en: "What is the perimeter of an equilateral triangle with a side of 6 cm?", vi: "Chu vi của tam giác đều có cạnh 6 cm là bao nhiêu?",
        choices: ["12 cm", "18 cm", "24 cm", "36 cm", "6 cm"], answer: 1,
        solution: "Tam giác đều có 3 cạnh bằng nhau: 3 × 6 = 18 cm.", vocab: ["equilateral triangle", "perimeter", "side"] }
    ]
  },
  {
    id: "cadet-2", title: "IKMC Cadet – Đề luyện 2", exam: "IKMC / Kangaroo", grade: "Lớp 7", level: "Trung bình – Khá", timeLimit: 30,
    questions: [
      { en: "Solve the equation 3x = 21.", vi: "Giải phương trình 3x = 21.",
        choices: ["18", "7", "24", "63", "3"], answer: 1,
        solution: "x = 21 ÷ 3 = 7.", vocab: ["equation", "solve"] },
      { en: "What is 12²?", vi: "Tính 12².",
        choices: ["124", "144", "122", "148", "121"], answer: 1,
        solution: "12² = 12 × 12 = 144.", vocab: ["power", "exponent"] },
      { en: "A train leaves at 9:15 and arrives at 11:00. How many minutes is the trip?", vi: "Một chuyến tàu khởi hành lúc 9:15 và đến nơi lúc 11:00. Chuyến đi kéo dài bao nhiêu phút?",
        choices: ["115", "105", "145", "100", "95"], answer: 1,
        solution: "Từ 9:15 đến 11:00 là 1 giờ 45 phút = 60 + 45 = 105 phút.", vocab: ["measure", "unit"] },
      { en: "The mean of five numbers is 10. What is their total?", vi: "Trung bình cộng của năm số là 10. Tổng của chúng là bao nhiêu?",
        choices: ["15", "50", "2", "10", "5"], answer: 1,
        solution: "Tổng = trung bình × số lượng = 10 × 5 = 50.", vocab: ["average", "total"] },
      { en: "How many degrees are there in a right angle?", vi: "Một góc vuông có bao nhiêu độ?",
        choices: ["180°", "90°", "45°", "60°", "360°"], answer: 1,
        solution: "Góc vuông bằng 90°.", vocab: ["angle", "degree", "perpendicular"] },
      { en: "What is 1/2 + 1/4?", vi: "Tính 1/2 + 1/4.",
        choices: ["1/3", "3/4", "2/6", "1/4", "2/4"], answer: 1,
        solution: "Quy đồng: 1/2 = 2/4. Vậy 2/4 + 1/4 = 3/4.", vocab: ["fraction", "numerator", "denominator"] },
      { en: "A shop reduces a 50-dollar price by 10%. What is the new price?", vi: "Một cửa hàng giảm giá 50 đô la đi 10%. Giá mới là bao nhiêu?",
        choices: ["40", "45", "55", "5", "49"], answer: 1,
        solution: "10% của 50 là 5. Giá mới = 50 − 5 = 45 đô la.", vocab: ["decrease", "percentage", "cost"] }
    ]
  },
  {
    id: "kangaroo-2", title: "Kangaroo Hỗn hợp – Đề luyện 2", exam: "IKMC / Kangaroo", grade: "Lớp 6-7", level: "Trung bình", timeLimit: 25,
    questions: [
      { en: "There are 5 rows of chairs with 6 chairs in each row. How many chairs are there altogether?", vi: "Có 5 hàng ghế, mỗi hàng 6 chiếc ghế. Tổng cộng có bao nhiêu chiếc ghế?",
        choices: ["11", "30", "56", "60", "25"], answer: 1,
        solution: "5 hàng × 6 ghế = 30 ghế.", vocab: ["row", "each", "altogether", "multiply"] },
      { en: "What is the smallest two-digit prime number?", vi: "Số nguyên tố nhỏ nhất có hai chữ số là số nào?",
        choices: ["10", "11", "13", "12", "17"], answer: 1,
        solution: "11 là số nguyên tố hai chữ số nhỏ nhất (10 và 12 là hợp số).", vocab: ["prime number", "digit", "minimum"] },
      { en: "Half of a number is 9. What is the number?", vi: "Một nửa của một số bằng 9. Số đó là bao nhiêu?",
        choices: ["4.5", "18", "9", "27", "16"], answer: 1,
        solution: "Nếu một nửa là 9 thì cả số là 9 × 2 = 18.", vocab: ["half", "double", "value"] },
      { en: "How many sides does a hexagon have?", vi: "Một hình lục giác có bao nhiêu cạnh?",
        choices: ["5", "6", "7", "8", "4"], answer: 1,
        solution: "Lục giác (hexagon) có 6 cạnh.", vocab: ["hexagon", "side"] },
      { en: "A rectangle is 8 cm long and 3 cm wide. What is its area?", vi: "Một hình chữ nhật dài 8 cm và rộng 3 cm. Diện tích của nó là bao nhiêu?",
        choices: ["22 cm²", "24 cm²", "11 cm²", "16 cm²", "48 cm²"], answer: 1,
        solution: "Diện tích hình chữ nhật = dài × rộng = 8 × 3 = 24 cm².", vocab: ["rectangle", "area", "length", "width"] },
      { en: "Arrange 0.3, 0.25 and 0.4 from smallest to largest. Which is in the middle?", vi: "Sắp xếp 0,3; 0,25 và 0,4 từ nhỏ đến lớn. Số ở giữa là số nào?",
        choices: ["0.4", "0.3", "0.25", "0.35", "0.2"], answer: 1,
        solution: "Thứ tự tăng dần: 0,25 < 0,3 < 0,4. Số ở giữa là 0,3.", vocab: ["arrange", "decimal", "less than"] }
    ]
  },
  {
    id: "imc-2", title: "IMC – Đề luyện 2", exam: "IMC", grade: "Lớp 7", level: "Khó", timeLimit: 30,
    questions: [
      { en: "What is the least common multiple (LCM) of 4 and 6?", vi: "Bội chung nhỏ nhất (BCNN) của 4 và 6 là bao nhiêu?",
        choices: ["24", "12", "10", "2", "48"], answer: 1,
        solution: "Bội của 4: 4, 8, 12… Bội của 6: 6, 12… Bội chung nhỏ nhất là 12.", vocab: ["multiple", "minimum"] },
      { en: "The angles of a triangle are in the ratio 1 : 2 : 3. What is the largest angle?", vi: "Các góc của một tam giác có tỉ lệ 1 : 2 : 3. Góc lớn nhất bằng bao nhiêu?",
        choices: ["60°", "90°", "120°", "30°", "100°"], answer: 1,
        solution: "Tổng các phần = 1 + 2 + 3 = 6. Tổng góc 180° ⇒ mỗi phần 30°. Góc lớn nhất = 3 × 30° = 90°.", vocab: ["angle", "ratio", "maximum", "triangle"] },
      { en: "If 3 pens cost 9 dollars, how much do 7 pens cost?", vi: "Nếu 3 chiếc bút giá 9 đô la, thì 7 chiếc bút giá bao nhiêu?",
        choices: ["18", "21", "27", "16", "63"], answer: 1,
        solution: "1 bút giá 9 ÷ 3 = 3 đô la. 7 bút giá 7 × 3 = 21 đô la.", vocab: ["cost", "each", "multiply"] },
      { en: "What is the value of 100 − 4²?", vi: "Giá trị của 100 − 4² là bao nhiêu?",
        choices: ["96", "84", "92", "16", "80"], answer: 1,
        solution: "4² = 16, rồi 100 − 16 = 84.", vocab: ["power", "subtract", "value"] },
      { en: "A number is both a multiple of 3 and a factor of 30. Which could it be?", vi: "Một số vừa là bội của 3 vừa là ước của 30. Số đó có thể là số nào?",
        choices: ["9", "15", "20", "4", "7"], answer: 1,
        solution: "Ước của 30: 1,2,3,5,6,10,15,30. Trong đó chia hết cho 3 có 3, 6, 15, 30. Chỉ 15 nằm trong các lựa chọn.", vocab: ["multiple", "factor", "divisible"] }
    ]
  },
  {
    id: "benjamin-3", title: "IKMC Benjamin – Đề luyện 3", exam: "IKMC / Kangaroo", grade: "Lớp 6", level: "Dễ – Trung bình", timeLimit: 30,
    questions: [
      { en: "What number is exactly halfway between 10 and 20?", vi: "Số nào nằm chính giữa 10 và 20?",
        choices: ["12", "15", "16", "14", "18"], answer: 1,
        solution: "Trung điểm = (10 + 20) ÷ 2 = 15.", vocab: ["midpoint", "average", "exactly"] },
      { en: "A clock shows 3:00. What is the angle between the hour hand and the minute hand?", vi: "Một chiếc đồng hồ chỉ 3:00. Góc giữa kim giờ và kim phút là bao nhiêu?",
        choices: ["45°", "90°", "120°", "60°", "180°"], answer: 1,
        solution: "Lúc 3:00, kim giờ chỉ số 3, kim phút chỉ số 12, tạo thành một góc vuông 90°.", vocab: ["angle", "degree"] },
      { en: "What is 6 × 7?", vi: "Tính 6 × 7.",
        choices: ["13", "42", "36", "48", "49"], answer: 1,
        solution: "6 × 7 = 42.", vocab: ["multiply", "product"] },
      { en: "Which number is an odd number?", vi: "Số nào là số lẻ?",
        choices: ["8", "17", "20", "4", "10"], answer: 1,
        solution: "17 không chia hết cho 2 nên là số lẻ.", vocab: ["odd", "even"] },
      { en: "A ribbon is 1 metre long. How many 20-centimetre pieces can be cut from it?", vi: "Một dải ruy băng dài 1 mét. Có thể cắt được bao nhiêu đoạn dài 20 xăng-ti-mét?",
        choices: ["4", "5", "20", "2", "10"], answer: 1,
        solution: "1 mét = 100 cm. 100 ÷ 20 = 5 đoạn.", vocab: ["length", "unit", "divide"] },
      { en: "What is the total number of faces on a cube?", vi: "Tổng số mặt của một khối lập phương là bao nhiêu?",
        choices: ["4", "6", "8", "12", "5"], answer: 1,
        solution: "Khối lập phương có 6 mặt.", vocab: ["cube", "total"] }
    ]
  },
  {
    id: "cadet-3", title: "IKMC Cadet – Đề luyện 3", exam: "IKMC / Kangaroo", grade: "Lớp 7", level: "Khá", timeLimit: 30,
    questions: [
      { en: "Solve: 2x − 5 = 11.", vi: "Giải: 2x − 5 = 11.",
        choices: ["3", "8", "16", "6", "13"], answer: 1,
        solution: "2x = 11 + 5 = 16 ⇒ x = 16 ÷ 2 = 8.", vocab: ["equation", "solve", "variable"] },
      { en: "What percentage is 15 out of 60?", vi: "15 chiếm bao nhiêu phần trăm của 60?",
        choices: ["15%", "25%", "40%", "30%", "20%"], answer: 1,
        solution: "15 ÷ 60 = 0,25 = 25%.", vocab: ["percentage", "ratio"] },
      { en: "The sum of two numbers is 20 and their difference is 4. What is the larger number?", vi: "Tổng hai số là 20 và hiệu của chúng là 4. Số lớn hơn là số nào?",
        choices: ["10", "12", "16", "8", "14"], answer: 1,
        solution: "Số lớn = (tổng + hiệu) ÷ 2 = (20 + 4) ÷ 2 = 12.", vocab: ["sum", "difference", "maximum"] },
      { en: "A cube has a side of 3 cm. What is its volume?", vi: "Một khối lập phương có cạnh 3 cm. Thể tích của nó là bao nhiêu?",
        choices: ["9 cm³", "27 cm³", "18 cm³", "12 cm³", "81 cm³"], answer: 1,
        solution: "Thể tích = cạnh³ = 3 × 3 × 3 = 27 cm³.", vocab: ["cube", "volume", "power"] },
      { en: "How many lines of symmetry does a square have?", vi: "Một hình vuông có bao nhiêu trục đối xứng?",
        choices: ["2", "4", "1", "8", "0"], answer: 1,
        solution: "Hình vuông có 4 trục đối xứng: 2 đường qua trung điểm các cạnh và 2 đường chéo.", vocab: ["symmetry", "square", "diagonal"] },
      { en: "If the average of 6, 10 and x is 9, what is x?", vi: "Nếu trung bình cộng của 6, 10 và x là 9, thì x bằng bao nhiêu?",
        choices: ["9", "11", "8", "27", "12"], answer: 1,
        solution: "Tổng = 9 × 3 = 27. Vậy x = 27 − 6 − 10 = 11.", vocab: ["average", "sum", "unknown"] }
    ]
  }
];
