# مكتبة أهل البيت (ع) - النسخة المتنقلة (Kotlin Multiplatform - Android & iOS)

تطبيق مكتبة أهل البيت (ع) المحلي والمستقل 100% دون اتصال بالإنترنت، مبني بتقنية **Kotlin Multiplatform (KMP)** مع **Compose Multiplatform (Android & iOS)** وقاعدة بيانات أصلية **SQLDelight (SQLite)** بديلة عن محرك المتصفح IndexedDB لأداء أصلي فائق السرعة على أجهزة آيفون وأندرويد.

---

## 🌟 الميزات المكتملة في تطبيق KMP

1. **قاعدة بيانات SQLite أصلية عابرة للمنصات (SQLDelight 2.0.2)**:
   - بديل كامل لمنطق IndexedDB الخاص بمتصفحات الويب: استخدام محرك SQLite الأصلي مباشرة على Android (`AndroidSqliteDriver`) و iOS (`NativeSqliteDriver`).
   - جداول مهيكلة: `BookEntity` (الكتب والبيانات الببليوغرافية)، `BookPageEntity` (ملايين النصوص والصفحات المفهرسة)، `BookmarkEntity` (الإشارات المرجعية والملاحظات الدراسية)، `PreferencesEntity` (خيارات الخط والمظهر).
   - استعلامات مفهرسة بـ `idx_pages_book_page` للاستجابة في أجزاء من الميلي ثانية حتى مع الكتب الضخمة.

2. **دعم كامل لنظامي Android و iOS**:
   - واجهة مستخدم موحدة بـ Compose Multiplatform (`commonMain`).
   - تشغيل مباشر على Android عبر `MainActivity.kt`.
   - تشغيل مباشر على iOS عبر SwiftUI Wrapper (`iosApp.xcodeproj` + `MainViewController.kt`).
   - دعم كامل للغة العربية واتجاه اليمين لليسار (`LocalLayoutDirection provides LayoutDirection.Rtl`).

3. **محرك تحليل واستيراد متعدد الصيغ (`TextParser.kt`)**:
   - تحليل ملفات `contents_full.json` (شجرة `abx.pages` مع استخراج العناوين والنصوص والأبناء).
   - تحليل ملفات `sahifa_5586.txt` (نمط ترويسات `===== صفحة X — Y =====` مع وسوم العناوين `#`).
   - تحليل وسوم XML `<page number="..." label="...">` و `<heading>`.
   - تطهير وتطبيع الأحرف العربية (`stripTashkeel` مع معالجة الهمزات والتاء المربوطة والألف المقصورة).
   - تصدير نصوص الكتب إلى صيغة `.txt` و `.json`.

4. **قارئ تفاعلي غني (`ReaderScreen.kt`)**:
   - 4 سمات قراءة: داكن (Dark)، ورق مصحف (Sepia)، أسود OLED، ونهاري (Light).
   - التحكم بحجم الخط وتباعد الأسطر، وخيار إخفاء حركات التشكيل.
   - فهرس أبواب منبثق (TOC Bottom Sheet) للانتقال المباشر لأي دعاء أو باب.
   - نافذة انتقال سريع برقم الصفحة (Quick Page Jump).
   - بحث فوري داخل صفحات الكتاب مع إبراز النتائج.
   - نسخ نصوص الصفحات إلى الحافظة بسهولة.
   - تدوين وحفظ الملاحظات الدراسية لكل صفحة.

5. **مساعد الاستفسار للناشئة والأسرة (`KidAskConsole.kt`)**:
   - استعلام فوري في نصوص الصحيفة السجادية (#5586) ومفاتيح الجنان (#11).
   - موضوعات تربوية مجهزة: الصبر، بر الوالدين، تفريج الهموم، التوبة، شكر العافية، سعة الرزق، ومكارم الأخلاق.
   - مطابقة دلالية بالألفاظ العربية المجرّدة من الحركات مع توجيه مباشر إلى رقم الصفحة.

6. **استيراد الكتب وإدارتها محلياً (`ImportDialog.kt`)**:
   - إمكانية لصق نصوص JSON أو TXT أو XML مباشرة وحفظها في قاعدة بيانات SQLite محلياً.
   - بطاقة تفاصيل الكتاب (`BookDetailsDialog.kt`) لعرض المحققين، الناشر، سنة الطبع، والجزء.

---

## 🚀 كيفية التشغيل والبناء

### 1. تشغيل تطبيق Android (Android Studio / Gradle):
```bash
# توليد كود SQLDelight وبناء تطبيق أندرويد:
./gradlew :composeApp:generateCommonMainAhlulbaytDatabaseInterface
./gradlew :composeApp:installDebug

# بناء حزمة APK مستقلة:
./gradlew :composeApp:assembleDebug
# ستجد ملف الـ APK في:
# composeApp/build/outputs/apk/debug/composeApp-debug.apk
```

### 2. تشغيل تطبيق iOS (Xcode):
1. افتح مجلد `iosApp/iosApp.xcodeproj` في برنامج **Xcode** على نظام macOS:
   ```bash
   open iosApp/iosApp.xcodeproj
   ```
2. اختر الجهاز الهدف (iPhone Simulator أو جهاز حقيقي).
3. اضغط على زر **Run (Cmd + R)**؛ سيقوم Xcode باستدعاء Gradle تلقائياً لتوليد كود SQLDelight وتجميع الـ Kotlin Framework وربطه في تطبيق iOS.

---

## 📁 هيكلية المشروع (Project Architecture)

```
AhlulbaytLibraryKMP/
├── composeApp/
│   ├── src/
│   │   ├── commonMain/
│   │   │   ├── sqldelight/net/ablibrary/local/db/
│   │   │   │   └── AhlulbaytDatabase.sq   # مخطط الجداول والاستعلامات بـ SQLDelight
│   │   │   ├── kotlin/net/ablibrary/local/
│   │   │   │   ├── App.kt                 # المنسق العام والشاشات
│   │   │   │   ├── db/
│   │   │   │   │   ├── DatabaseDriverFactory.kt  # Expect class لإنشاء SqlDriver
│   │   │   │   │   └── SqlDelightStorage.kt      # مستودع استعلامات SQLite الأصلية
│   │   │   │   ├── data/                  # بيانات الكتب الافتراضية
│   │   │   │   ├── model/                 # LibraryStorage ونماذج البيانات
│   │   │   │   ├── ui/                    # HomeScreen, ReaderScreen, KidAskConsole, Dialogs
│   │   │   │   └── utils/                 # TextParser
│   │   ├── androidMain/
│   │   │   └── kotlin/net/ablibrary/local/
│   │   │       ├── MainActivity.kt
│   │   │       └── db/DatabaseDriverFactory.kt  # AndroidSqliteDriver
│   │   └── iosMain/
│   │       └── kotlin/net/ablibrary/local/
│   │           ├── MainViewController.kt
│   │           └── db/DatabaseDriverFactory.kt  # NativeSqliteDriver
│   └── build.gradle.kts
├── iosApp/                                # مشروع Xcode المكتمل لنظام iOS
│   ├── iosApp/
│   └── iosApp.xcodeproj
├── gradle/
│   └── libs.versions.toml                 # إصدارات SQLDelight 2.0.2 والـ Plugins
├── build.gradle.kts
└── settings.gradle.kts
```
