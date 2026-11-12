# Market Map

แผนที่มูลค่าหุ้น S&P 500 และ SET100 พร้อมราคาเกือบสด ข่าว และแนวรับแนวต้าน

ใช้เพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน

## ข้อมูลมาจากไหน

| ข้อมูล | ไฟล์ | ใครอัปเดต |
|---|---|---|
| รายชื่อหุ้น กลุ่ม มูลค่าฐาน | `universe/us.csv`, `universe/th.csv` | แก้เองเมื่อรายชื่อดัชนีเปลี่ยน |
| ราคาล่าสุด | สร้างใหม่ทุกครั้งที่ deploy (ไม่ commit) | GitHub Actions `update-site.yml` |
| ราคาย้อนหลัง 1 ปี (OHLCV รายวัน) | `history/us/*.csv`, `history/th/*.csv` | GitHub Actions `save-history.yml` |
| ข่าว บทสรุป การคาดการณ์ | `content/us.json`, `content/th.json` | Claude (commit ลง repo) |

ราคาทั้งหมดมาจาก Yahoo Finance ผ่าน [yfinance](https://github.com/ranaroussi/yfinance) ซึ่งไม่ใช่ API ทางการ

## ตารางเวลา (จันทร์–ศุกร์)

- **ราคาล่าสุด:** ดึงทุก 15 นาทีช่วง 10:00–16:45 และ 20:00–04:45 น. เวลาไทย แล้ว deploy หน้าเว็บ ข้อมูลช้ากว่าตลาดราว 15–30 นาที เพราะ Yahoo หน่วงราคาและ GitHub อาจเริ่มงานตามเวลาช้า
- **ราคาย้อนหลัง:** บันทึกหลังตลาดไทยปิด (17:15 น.) และหลังตลาดสหรัฐฯ ปิด (04:30 น.)
- **หน้าเว็บ:** deploy ใหม่ทุกครั้งที่มี commit เข้า `main` เช่น เมื่อ Claude อัปเดตข่าว

## รูปแบบ `content/<market>.json`

```json
{
  "sectors": {
    "meta": {"week": "สัปดาห์ 2–6 พ.ย. 2026", "summary": ["ภาพรวมตลาด ข้อละ 1 ย่อหน้า"]},
    "<รหัสกลุ่มตาม universe>": {"w": 1.23, "items": ["ข่าวและปัจจัยของกลุ่ม"]}
  },
  "companies": {
    "<TICKER>": {
      "price": 0, "n": 0, "rating": "", "tgt": [0, 0, 0], "br": [0, 0, 0, 0, 0],
      "next": "", "news": [["วันที่", "ข่าว"]], "eps": [["ไตรมาส", 0, 0]],
      "rev": {"last": ["ไตรมาส", 0, 0], "nxt": ["ไตรมาส", 0, 0], "cons": 0}, "note": ""
    }
  }
}
```

- `w` คือ % เปลี่ยนแปลงของกลุ่มทั้งสัปดาห์
- `tgt` คือเป้าราคา [ต่ำสุด, เฉลี่ย, สูงสุด]
- `br` คือจำนวนนักวิเคราะห์ [Strong Buy, Buy, Hold, Sell, Strong Sell]
- `eps` แต่ละไตรมาสคือ [ไตรมาส, คาด, จริง] โดยใส่คาดเป็น `null` ได้
- ทุก key ใน `companies` ไม่บังคับ ยกเว้น `news` และ `next` ถ้าไม่มีให้ตัดบริษัทนั้นออก

## รันบนเครื่อง

```bash
pip install -r requirements.txt
```

```bash
python scripts/fetch_prices.py latest us
```

```bash
python scripts/fetch_prices.py latest th
```

```bash
python scripts/build_data.py
```

```bash
python -m http.server 8765 --directory site
```

แล้วเปิด http://localhost:8765
