# 🤖 מדריך שימוש ב-OpenAI Routing

## סטטוס נוכחי

בלוגים של השרות תראה:
```
RoutingService initialized { hasApiKey: false, model: 'gpt-3.5-turbo' }
```

אם `hasApiKey: false` → OpenAI לא מוגדר, וה-routing יעבוד עם fallback (rule-based).

---

## שלב 1: קבלת OpenAI API Key

1. לך ל-[https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. התחבר או צור חשבון
3. לחץ **"Create new secret key"**
4. העתק את המפתח (מתחיל ב-`sk-`)

---

## שלב 2: הוספת המפתח ל-`.env`

פתח את `services/coordinator/.env` והוסף:

```env
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
```

**החלף** `sk-your-actual-key-here` במפתח האמיתי שלך.

---

## שלב 3: הפעלה מחדש

```bash
# עצור את השרות (Ctrl+C)
npm start
```

עכשיו בלוגים תראה:
```
RoutingService initialized { hasApiKey: true, model: 'gpt-3.5-turbo' }
```

---

## שלב 4: שימוש ב-AI Routing

### דרך 1: POST Request

**Postman:**
- Method: `POST`
- URL: `http://localhost:3000/route`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "query": "I need to get user profile information",
  "method": "GET",
  "path": "/api/users/123"
}
```

**Response:**
```json
{
  "success": true,
  "routing": {
    "serviceName": "user-service",
    "confidence": 0.95,
    "reasoning": "The query is about user profiles, which matches the user-service",
    "service": {
      "endpoint": "http://localhost:3001",
      "version": "1.0.0",
      "status": "active"
    }
  }
}
```

### דרך 2: GET Request

**URL:**
```
GET http://localhost:3000/route?q=get%20user%20profile
```

או:
```
GET http://localhost:3000/route?query=process%20payment
```

---

## דוגמאות שימוש

### דוגמה 1: חיפוש משתמש
```json
POST /route
{
  "query": "find user by email",
  "method": "GET"
}
```

**תוצאה:** OpenAI יזהה שזה צריך `user-service`

### דוגמה 2: עיבוד תשלום
```json
POST /route
{
  "query": "process payment for order",
  "method": "POST",
  "body": {
    "amount": 100,
    "currency": "USD"
  }
}
```

**תוצאה:** OpenAI יזהה שזה צריך `payment-service` או `order-service`

### דוגמה 3: חיפוש מוצר
```json
POST /route
{
  "query": "search for products",
  "method": "GET",
  "path": "/api/products?q=laptop"
}
```

**תוצאה:** OpenAI יזהה שזה צריך `product-service`

---

## איך זה עובד?

1. **השרות בונה context** מכל השירותים הרשומים
2. **יוצר prompt** עם:
   - רשימת השירותים הזמינים
   - ה-query שלך
   - הקשר של הבקשה (method, path, body)
3. **שולח ל-OpenAI** (GPT-3.5-turbo)
4. **מקבל החלטה** עם:
   - שירות מתאים
   - Confidence score (0-1)
   - הסבר (reasoning)
5. **מחזיר** את כל המידע + endpoint של השירות

---

## Fallback Behavior

אם OpenAI לא זמין או נכשל:
- ✅ השרות **לא יקרוס**
- ✅ יעבור ל-**rule-based routing** (keyword matching)
- ✅ עדיין יחזיר תוצאה (אבל פחות מדויקת)

---

## בדיקה מהירה

### 1. בדוק שהמפתח מוגדר:
```bash
curl http://localhost:3000/health
```

בדוק בלוגים - אמור להיות `hasApiKey: true`

### 2. נסה routing:
```bash
curl -X POST http://localhost:3000/route \
  -H "Content-Type: application/json" \
  -d '{"query": "get user profile"}'
```

### 3. בדוק את התוצאה:
- אם `success: true` עם `confidence` גבוה → ✅ OpenAI עובד!
- אם `success: true` עם `confidence: 0.7` → Fallback (keyword matching)
- אם `success: false` → אין שירות מתאים

---

## Troubleshooting

### ❌ "OPENAI_API_KEY environment variable is not set"
- הוסף את המפתח ל-`.env`
- הפעל מחדש את השרות

### ❌ "OpenAI API error: 401"
- המפתח לא תקין או פג תוקף
- קבל מפתח חדש מ-OpenAI

### ❌ "OpenAI API error: 429"
- הגעת ל-rate limit
- חכה רגע ונסה שוב
- שקול לשדרג את התוכנית

### ✅ Routing עובד אבל עם fallback
- בדוק בלוגים - יש שגיאה מ-OpenAI?
- בדוק שהמפתח תקין
- בדוק שיש credits ב-OpenAI account

---

## עלויות

- **Model:** `gpt-3.5-turbo` (הכי זול)
- **Tokens:** מוגבל ל-200 tokens per request
- **Temperature:** 0.3 (עקביות)
- **עלות משוערת:** ~$0.0001-0.0002 per request

---

## טיפים

1. **רשום שירותים עם שמות ברורים** - זה עוזר ל-AI לזהות אותם
2. **הוסף migrationFile עם schema** - זה נותן context נוסף
3. **השתמש ב-queries ברורים** - "get user" טוב יותר מ-"user stuff"
4. **בדוק את ה-confidence** - אם נמוך מ-0.7, אולי צריך לשפר את ה-query

---

**מוכן!** 🚀 עכשיו ה-AI routing יעבוד עם OpenAI.


