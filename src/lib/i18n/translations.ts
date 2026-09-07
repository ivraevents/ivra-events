export type Locale = "en" | "hi" | "kn";

export const LOCALES: { code: Locale; native: string }[] = [
  { code: "en", native: "EN" },
  { code: "hi", native: "हिं" },
  { code: "kn", native: "ಕನ" },
];

export const DEFAULT_LOCALE: Locale = "en";

type Dict = Record<string, string>;

const en: Dict = {
  "header.upcomingEvents": "Upcoming Events",
  "header.signIn": "Sign In",

  "hero.badge": "India's most curated flea markets",
  "hero.title": "Book your stall. Grow your business.",
  "hero.subtitle":
    "Browse upcoming flea markets, pick your spot on the stall map, and manage documents, payments and invoices — all in one place.",
  "hero.browseEvents": "Browse Events",
  "hero.signIn": "Sign In",

  "events.heading": "Upcoming Flea Markets",
  "events.subheading": "Find your next stall — search by event, city, or venue.",
  "events.searchPlaceholder": "Search events, cities or venues",
  "events.chooseCity": "Choose a city",
  "events.allCities": "All Cities",
  "events.applicationsOpen": "Applications open",
  "events.stallsAvailable": "stalls available",
  "events.viewEvent": "View Event",
  "events.imageComingSoon": "Event image coming soon",
  "events.ends": "Ends",
  "events.emptyNoEventsTitle": "No upcoming events right now",
  "events.emptyNoEventsDesc": "Check back soon — new flea markets are added regularly.",
  "events.emptyNoMatchTitle": "No events match your search",
  "events.emptyNoMatchDesc": "Try a different city or search term.",

  "instagram.eyebrow": "IVRA Events on Instagram",
  "instagram.follow": "Follow @{handle}",
  "instagram.desc": "See event highlights, stall openings, and vendor updates.",
  "instagram.cta": "View Instagram",

  "stats.eyebrow": "Trusted by vendors across India",
  "stats.headingPlain": "Our",
  "stats.headingAccent": "Statistics",
  "stats.subheading": "Connecting vendors with flea markets across India.",
  "stats.eventsHosted": "Events Hosted",
  "stats.registeredVendors": "Registered Vendors",
  "stats.stallsBooked": "Stalls Booked",
  "stats.vendorSatisfaction": "Vendor Satisfaction",

  "footer.tagline":
    "Book your stall at India's most curated flea markets — browse events, pick your spot, and manage everything from one place.",
  "footer.companyHeading": "Company",
  "footer.about": "About",
  "footer.contact": "Contact",
  "footer.privacy": "Privacy Policy",
  "footer.vendorsHeading": "For Vendors",
  "footer.upcomingEvents": "Upcoming Events",
  "footer.signIn": "Sign In",
  "footer.myDashboard": "My Dashboard",
  "footer.rights": "All rights reserved.",

  "about.title": "About IVRA Events",
  "about.p1":
    "IVRA Events organizes curated flea markets and lifestyle exhibitions, and gives vendors a straightforward way to find events, pick a stall, and handle the paperwork that comes with it — all from one place.",
  "about.p2":
    "Instead of juggling phone calls and spreadsheets, vendors can browse upcoming markets, see a live map of available stalls, apply, upload the documents an event needs, pay securely, and get their GST or non-GST invoice — without leaving the app.",
  "about.p3Pre": "Have a question about an upcoming event, or want to bring your stall to one of our markets? Reach out any time from the",
  "about.p3Link": "contact page",

  "contact.title": "Contact Us",
  "contact.intro":
    "Questions about an event, a booking, or bringing your stall to an IVRA Events flea market? We're happy to help.",
  "contact.alreadyRegisteredPre": "Already registered? Sign in and use the",
  "contact.supportLink": "Support",
  "contact.alreadyRegisteredPost":
    "section for booking-specific questions — it's the fastest way to reach us about an existing registration.",

  "privacy.title": "Privacy Policy",
  "privacy.lastUpdated": "Last updated",
  "privacy.intro":
    "This page explains what information IVRA Events collects when you use this app to browse events and book stalls, and how it's used.",
  "privacy.collectHeading": "Information we collect",
  "privacy.collectBody":
    "Account details (name, email, mobile number), identity and business documents you upload for a booking (such as Aadhaar, PAN, or GST certificate), and booking-related information (registrations, payments, invoices, and support messages).",
  "privacy.useHeading": "How it's used",
  "privacy.useBody":
    "To create and manage your account, process stall bookings and payments, verify the documents an event requires, generate invoices, and respond to support requests. Identity documents are only reviewed by authorized event staff for verification purposes.",
  "privacy.storeHeading": "How it's stored",
  "privacy.storeBody":
    "Data is stored with Supabase, access-controlled so you can only see your own records (or, for staff, only what their role requires). Uploaded documents are kept in a private file store, never publicly accessible.",
  "privacy.choicesHeading": "Your choices",
  "privacy.choicesBodyPre":
    "You can review and update your profile at any time from the app, and can request access to or deletion of your data by contacting us on the",
  "privacy.choicesLink": "Contact page",
  "privacy.disclaimer":
    "This page is a general starting template and isn't legal advice. Because this app collects government ID documents (like Aadhaar), we'd recommend having it reviewed by a lawyer familiar with India's data protection rules before you rely on it.",
};

const hi: Dict = {
  "header.upcomingEvents": "आगामी कार्यक्रम",
  "header.signIn": "साइन इन करें",

  "hero.badge": "भारत के सबसे चुनिंदा फ्ली मार्केट",
  "hero.title": "अपना स्टॉल बुक करें। अपना व्यवसाय बढ़ाएं।",
  "hero.subtitle":
    "आगामी फ्ली मार्केट देखें, स्टॉल मैप पर अपनी जगह चुनें, और दस्तावेज़, भुगतान व इनवॉइस — सब कुछ एक ही जगह से प्रबंधित करें।",
  "hero.browseEvents": "कार्यक्रम देखें",
  "hero.signIn": "साइन इन करें",

  "events.heading": "आगामी फ्ली मार्केट",
  "events.subheading": "अपना अगला स्टॉल खोजें — कार्यक्रम, शहर या स्थान से खोजें।",
  "events.searchPlaceholder": "कार्यक्रम, शहर या स्थान खोजें",
  "events.chooseCity": "शहर चुनें",
  "events.allCities": "सभी शहर",
  "events.applicationsOpen": "आवेदन खुले हैं",
  "events.stallsAvailable": "स्टॉल उपलब्ध",
  "events.viewEvent": "कार्यक्रम देखें",
  "events.imageComingSoon": "कार्यक्रम की तस्वीर जल्द आएगी",
  "events.ends": "समाप्ति",
  "events.emptyNoEventsTitle": "फ़िलहाल कोई आगामी कार्यक्रम नहीं है",
  "events.emptyNoEventsDesc": "जल्द ही फिर देखें — नए फ्ली मार्केट नियमित रूप से जोड़े जाते हैं।",
  "events.emptyNoMatchTitle": "आपकी खोज से कोई कार्यक्रम मेल नहीं खाता",
  "events.emptyNoMatchDesc": "किसी अन्य शहर या खोज शब्द को आज़माएं।",

  "instagram.eyebrow": "इंस्टाग्राम पर IVRA Events",
  "instagram.follow": "@{handle} को फ़ॉलो करें",
  "instagram.desc": "कार्यक्रम की झलकियां, नए स्टॉल और वेंडर अपडेट देखें।",
  "instagram.cta": "इंस्टाग्राम देखें",

  "stats.eyebrow": "पूरे भारत के वेंडरों का भरोसा",
  "stats.headingPlain": "हमारे",
  "stats.headingAccent": "आंकड़े",
  "stats.subheading": "पूरे भारत में वेंडरों को फ्ली मार्केट से जोड़ना।",
  "stats.eventsHosted": "आयोजित कार्यक्रम",
  "stats.registeredVendors": "पंजीकृत वेंडर",
  "stats.stallsBooked": "बुक किए गए स्टॉल",
  "stats.vendorSatisfaction": "वेंडर संतुष्टि",

  "footer.tagline":
    "भारत के सबसे चुनिंदा फ्ली मार्केट में अपना स्टॉल बुक करें — कार्यक्रम देखें, अपनी जगह चुनें, और सब कुछ एक ही जगह से प्रबंधित करें।",
  "footer.companyHeading": "कंपनी",
  "footer.about": "हमारे बारे में",
  "footer.contact": "संपर्क करें",
  "footer.privacy": "गोपनीयता नीति",
  "footer.vendorsHeading": "वेंडरों के लिए",
  "footer.upcomingEvents": "आगामी कार्यक्रम",
  "footer.signIn": "साइन इन करें",
  "footer.myDashboard": "मेरा डैशबोर्ड",
  "footer.rights": "सर्वाधिकार सुरक्षित।",

  "about.title": "IVRA Events के बारे में",
  "about.p1":
    "IVRA Events चुनिंदा फ्ली मार्केट और लाइफस्टाइल प्रदर्शनियों का आयोजन करता है, और वेंडरों को कार्यक्रम खोजने, स्टॉल चुनने और उससे जुड़े कागज़ी काम को — सब एक ही जगह से — आसानी से संभालने का तरीका देता है।",
  "about.p2":
    "फ़ोन कॉल और स्प्रेडशीट में उलझने के बजाय, वेंडर आगामी बाज़ार देख सकते हैं, उपलब्ध स्टॉल का लाइव मैप देख सकते हैं, आवेदन कर सकते हैं, ज़रूरी दस्तावेज़ अपलोड कर सकते हैं, सुरक्षित भुगतान कर सकते हैं, और GST या नॉन-GST इनवॉइस पा सकते हैं — ऐप छोड़े बिना।",
  "about.p3Pre": "किसी आगामी कार्यक्रम के बारे में सवाल है, या अपना स्टॉल हमारे किसी बाज़ार में लगाना चाहते हैं? कभी भी",
  "about.p3Link": "संपर्क पेज",

  "contact.title": "संपर्क करें",
  "contact.intro":
    "किसी कार्यक्रम, बुकिंग, या अपना स्टॉल किसी IVRA Events फ्ली मार्केट में लगाने से जुड़ा सवाल है? हमें मदद करने में खुशी होगी।",
  "contact.alreadyRegisteredPre": "पहले से पंजीकृत हैं? साइन इन करें और",
  "contact.supportLink": "सपोर्ट",
  "contact.alreadyRegisteredPost":
    "सेक्शन का उपयोग करें — किसी मौजूदा पंजीकरण से जुड़े सवाल के लिए हम तक पहुंचने का यह सबसे तेज़ तरीका है।",

  "privacy.title": "गोपनीयता नीति",
  "privacy.lastUpdated": "आख़िरी अपडेट",
  "privacy.intro":
    "यह पेज बताता है कि जब आप इस ऐप से कार्यक्रम देखते हैं और स्टॉल बुक करते हैं, तो IVRA Events कौन-सी जानकारी इकट्ठा करता है, और उसका उपयोग कैसे होता है।",
  "privacy.collectHeading": "हम कौन-सी जानकारी इकट्ठा करते हैं",
  "privacy.collectBody":
    "खाता विवरण (नाम, ईमेल, मोबाइल नंबर), बुकिंग के लिए अपलोड किए गए पहचान और व्यवसाय दस्तावेज़ (जैसे आधार, पैन, या GST प्रमाणपत्र), और बुकिंग से जुड़ी जानकारी (पंजीकरण, भुगतान, इनवॉइस, और सपोर्ट संदेश)।",
  "privacy.useHeading": "इसका उपयोग कैसे होता है",
  "privacy.useBody":
    "आपका खाता बनाने और प्रबंधित करने, स्टॉल बुकिंग और भुगतान संसाधित करने, कार्यक्रम को ज़रूरी दस्तावेज़ों की पुष्टि करने, इनवॉइस बनाने, और सपोर्ट अनुरोधों का जवाब देने के लिए। पहचान दस्तावेज़ केवल अधिकृत कार्यक्रम स्टाफ़ द्वारा सत्यापन के उद्देश्य से देखे जाते हैं।",
  "privacy.storeHeading": "इसे कैसे संग्रहीत किया जाता है",
  "privacy.storeBody":
    "डेटा Supabase के साथ संग्रहीत किया जाता है, जिसकी पहुंच नियंत्रित होती है ताकि आप केवल अपना रिकॉर्ड देख सकें (या स्टाफ़ के लिए, केवल उनकी भूमिका के अनुसार जो ज़रूरी हो)। अपलोड किए गए दस्तावेज़ एक निजी फ़ाइल स्टोर में रखे जाते हैं, जो कभी सार्वजनिक रूप से सुलभ नहीं होता।",
  "privacy.choicesHeading": "आपके विकल्प",
  "privacy.choicesBodyPre":
    "आप किसी भी समय ऐप से अपनी प्रोफ़ाइल देख और अपडेट कर सकते हैं, और",
  "privacy.choicesLink": "संपर्क पेज",
  "privacy.disclaimer":
    "यह पेज एक सामान्य आरंभिक टेम्पलेट है और कानूनी सलाह नहीं है। चूंकि यह ऐप सरकारी पहचान दस्तावेज़ (जैसे आधार) इकट्ठा करता है, इसलिए इस पर भरोसा करने से पहले भारत के डेटा सुरक्षा नियमों से परिचित किसी वकील से इसकी समीक्षा करवाने की सलाह दी जाती है।",
};

const kn: Dict = {
  "header.upcomingEvents": "ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳು",
  "header.signIn": "ಸೈನ್ ಇನ್ ಮಾಡಿ",

  "hero.badge": "ಭಾರತದ ಅತ್ಯುತ್ತಮ ಆಯ್ಕೆಯ ಫ್ಲೀ ಮಾರುಕಟ್ಟೆಗಳು",
  "hero.title": "ನಿಮ್ಮ ಸ್ಟಾಲ್ ಬುಕ್ ಮಾಡಿ. ನಿಮ್ಮ ವ್ಯವಹಾರವನ್ನು ಬೆಳೆಸಿ.",
  "hero.subtitle":
    "ಮುಂಬರುವ ಫ್ಲೀ ಮಾರುಕಟ್ಟೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ, ಸ್ಟಾಲ್ ನಕ್ಷೆಯಲ್ಲಿ ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಆಯ್ಕೆಮಾಡಿ, ಮತ್ತು ದಾಖಲೆಗಳು, ಪಾವತಿಗಳು ಹಾಗೂ ಇನ್‌ವಾಯ್ಸ್‌ಗಳನ್ನು ಒಂದೇ ಸ್ಥಳದಿಂದ ನಿರ್ವಹಿಸಿ.",
  "hero.browseEvents": "ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ವೀಕ್ಷಿಸಿ",
  "hero.signIn": "ಸೈನ್ ಇನ್ ಮಾಡಿ",

  "events.heading": "ಮುಂಬರುವ ಫ್ಲೀ ಮಾರುಕಟ್ಟೆಗಳು",
  "events.subheading": "ನಿಮ್ಮ ಮುಂದಿನ ಸ್ಟಾಲ್ ಹುಡುಕಿ — ಕಾರ್ಯಕ್ರಮ, ನಗರ ಅಥವಾ ಸ್ಥಳದ ಮೂಲಕ ಹುಡುಕಿ.",
  "events.searchPlaceholder": "ಕಾರ್ಯಕ್ರಮಗಳು, ನಗರಗಳು ಅಥವಾ ಸ್ಥಳಗಳನ್ನು ಹುಡುಕಿ",
  "events.chooseCity": "ನಗರವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
  "events.allCities": "ಎಲ್ಲಾ ನಗರಗಳು",
  "events.applicationsOpen": "ಅರ್ಜಿಗಳು ತೆರೆದಿವೆ",
  "events.stallsAvailable": "ಸ್ಟಾಲ್‌ಗಳು ಲಭ್ಯವಿದೆ",
  "events.viewEvent": "ಕಾರ್ಯಕ್ರಮ ವೀಕ್ಷಿಸಿ",
  "events.imageComingSoon": "ಕಾರ್ಯಕ್ರಮದ ಚಿತ್ರ ಶೀಘ್ರದಲ್ಲೇ ಬರಲಿದೆ",
  "events.ends": "ಮುಕ್ತಾಯ",
  "events.emptyNoEventsTitle": "ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳಿಲ್ಲ",
  "events.emptyNoEventsDesc": "ಶೀಘ್ರದಲ್ಲೇ ಮತ್ತೆ ಪರಿಶೀಲಿಸಿ — ಹೊಸ ಫ್ಲೀ ಮಾರುಕಟ್ಟೆಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಸೇರಿಸಲಾಗುತ್ತದೆ.",
  "events.emptyNoMatchTitle": "ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುವ ಕಾರ್ಯಕ್ರಮಗಳಿಲ್ಲ",
  "events.emptyNoMatchDesc": "ಬೇರೆ ನಗರ ಅಥವಾ ಹುಡುಕಾಟ ಪದವನ್ನು ಪ್ರಯತ್ನಿಸಿ.",

  "instagram.eyebrow": "ಇನ್‌ಸ್ಟಾಗ್ರಾಂನಲ್ಲಿ IVRA Events",
  "instagram.follow": "@{handle} ಅನ್ನು ಫಾಲೋ ಮಾಡಿ",
  "instagram.desc": "ಕಾರ್ಯಕ್ರಮದ ಹೈಲೈಟ್‌ಗಳು, ಹೊಸ ಸ್ಟಾಲ್‌ಗಳು ಮತ್ತು ವೆಂಡರ್ ಅಪ್‌ಡೇಟ್‌ಗಳನ್ನು ನೋಡಿ.",
  "instagram.cta": "ಇನ್‌ಸ್ಟಾಗ್ರಾಂ ವೀಕ್ಷಿಸಿ",

  "stats.eyebrow": "ಭಾರತದಾದ್ಯಂತ ವೆಂಡರ್‌ಗಳ ನಂಬಿಕೆ",
  "stats.headingPlain": "ನಮ್ಮ",
  "stats.headingAccent": "ಅಂಕಿಅಂಶಗಳು",
  "stats.subheading": "ಭಾರತದಾದ್ಯಂತ ವೆಂಡರ್‌ಗಳನ್ನು ಫ್ಲೀ ಮಾರುಕಟ್ಟೆಗಳೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುವುದು.",
  "stats.eventsHosted": "ಆಯೋಜಿಸಿದ ಕಾರ್ಯಕ್ರಮಗಳು",
  "stats.registeredVendors": "ನೋಂದಾಯಿತ ವೆಂಡರ್‌ಗಳು",
  "stats.stallsBooked": "ಬುಕ್ ಆದ ಸ್ಟಾಲ್‌ಗಳು",
  "stats.vendorSatisfaction": "ವೆಂಡರ್ ತೃಪ್ತಿ",

  "footer.tagline":
    "ಭಾರತದ ಅತ್ಯುತ್ತಮ ಆಯ್ಕೆಯ ಫ್ಲೀ ಮಾರುಕಟ್ಟೆಗಳಲ್ಲಿ ನಿಮ್ಮ ಸ್ಟಾಲ್ ಬುಕ್ ಮಾಡಿ — ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ವೀಕ್ಷಿಸಿ, ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಆಯ್ಕೆಮಾಡಿ, ಮತ್ತು ಎಲ್ಲವನ್ನೂ ಒಂದೇ ಸ್ಥಳದಿಂದ ನಿರ್ವಹಿಸಿ.",
  "footer.companyHeading": "ಕಂಪನಿ",
  "footer.about": "ನಮ್ಮ ಬಗ್ಗೆ",
  "footer.contact": "ಸಂಪರ್ಕಿಸಿ",
  "footer.privacy": "ಗೌಪ್ಯತಾ ನೀತಿ",
  "footer.vendorsHeading": "ವೆಂಡರ್‌ಗಳಿಗಾಗಿ",
  "footer.upcomingEvents": "ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳು",
  "footer.signIn": "ಸೈನ್ ಇನ್ ಮಾಡಿ",
  "footer.myDashboard": "ನನ್ನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
  "footer.rights": "ಎಲ್ಲಾ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.",

  "about.title": "IVRA Events ಬಗ್ಗೆ",
  "about.p1":
    "IVRA Events ಆಯ್ಕೆಯ ಫ್ಲೀ ಮಾರುಕಟ್ಟೆಗಳು ಮತ್ತು ಲೈಫ್‌ಸ್ಟೈಲ್ ಪ್ರದರ್ಶನಗಳನ್ನು ಆಯೋಜಿಸುತ್ತದೆ, ಮತ್ತು ವೆಂಡರ್‌ಗಳಿಗೆ ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ಹುಡುಕಲು, ಸ್ಟಾಲ್ ಆಯ್ಕೆಮಾಡಲು ಮತ್ತು ಅದರೊಂದಿಗೆ ಬರುವ ದಾಖಲೆಗಳನ್ನು ನಿರ್ವಹಿಸಲು — ಎಲ್ಲವನ್ನೂ ಒಂದೇ ಸ್ಥಳದಿಂದ — ಸುಲಭ ಮಾರ್ಗವನ್ನು ನೀಡುತ್ತದೆ.",
  "about.p2":
    "ಫೋನ್ ಕರೆಗಳು ಮತ್ತು ಸ್ಪ್ರೆಡ್‌ಶೀಟ್‌ಗಳ ಬದಲಿಗೆ, ವೆಂಡರ್‌ಗಳು ಮುಂಬರುವ ಮಾರುಕಟ್ಟೆಗಳನ್ನು ವೀಕ್ಷಿಸಬಹುದು, ಲಭ್ಯವಿರುವ ಸ್ಟಾಲ್‌ಗಳ ಲೈವ್ ನಕ್ಷೆಯನ್ನು ನೋಡಬಹುದು, ಅರ್ಜಿ ಸಲ್ಲಿಸಬಹುದು, ಕಾರ್ಯಕ್ರಮಕ್ಕೆ ಬೇಕಾದ ದಾಖಲೆಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಬಹುದು, ಸುರಕ್ಷಿತವಾಗಿ ಪಾವತಿಸಬಹುದು, ಮತ್ತು GST ಅಥವಾ GST ಅಲ್ಲದ ಇನ್‌ವಾಯ್ಸ್ ಪಡೆಯಬಹುದು — ಆ್ಯಪ್ ಬಿಡದೆ.",
  "about.p3Pre": "ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮದ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಇದೆಯೇ, ಅಥವಾ ನಮ್ಮ ಮಾರುಕಟ್ಟೆಗಳಲ್ಲಿ ಒಂದಕ್ಕೆ ನಿಮ್ಮ ಸ್ಟಾಲ್ ತರಲು ಬಯಸುವಿರಾ? ಯಾವುದೇ ಸಮಯದಲ್ಲಿ",
  "about.p3Link": "ಸಂಪರ್ಕ ಪುಟ",

  "contact.title": "ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ",
  "contact.intro":
    "ಒಂದು ಕಾರ್ಯಕ್ರಮ, ಬುಕಿಂಗ್, ಅಥವಾ IVRA Events ಫ್ಲೀ ಮಾರುಕಟ್ಟೆಗೆ ನಿಮ್ಮ ಸ್ಟಾಲ್ ತರುವ ಬಗ್ಗೆ ಪ್ರಶ್ನೆಗಳಿವೆಯೇ? ನಾವು ಸಹಾಯ ಮಾಡಲು ಸಂತೋಷಪಡುತ್ತೇವೆ.",
  "contact.alreadyRegisteredPre": "ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಿದ್ದೀರಾ? ಸೈನ್ ಇನ್ ಮಾಡಿ ಮತ್ತು",
  "contact.supportLink": "ಸಪೋರ್ಟ್",
  "contact.alreadyRegisteredPost":
    "ವಿಭಾಗವನ್ನು ಬಳಸಿ — ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ ನೋಂದಣಿ ಬಗ್ಗೆ ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಲು ಇದು ಅತ್ಯಂತ ವೇಗದ ಮಾರ್ಗ.",

  "privacy.title": "ಗೌಪ್ಯತಾ ನೀತಿ",
  "privacy.lastUpdated": "ಕೊನೆಯ ನವೀಕರಣ",
  "privacy.intro":
    "ಈ ಪುಟವು ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ವೀಕ್ಷಿಸಲು ಮತ್ತು ಸ್ಟಾಲ್‌ಗಳನ್ನು ಬುಕ್ ಮಾಡಲು ನೀವು ಈ ಆ್ಯಪ್ ಬಳಸುವಾಗ IVRA Events ಯಾವ ಮಾಹಿತಿಯನ್ನು ಸಂಗ್ರಹಿಸುತ್ತದೆ ಮತ್ತು ಅದನ್ನು ಹೇಗೆ ಬಳಸಲಾಗುತ್ತದೆ ಎಂಬುದನ್ನು ವಿವರಿಸುತ್ತದೆ.",
  "privacy.collectHeading": "ನಾವು ಸಂಗ್ರಹಿಸುವ ಮಾಹಿತಿ",
  "privacy.collectBody":
    "ಖಾತೆ ವಿವರಗಳು (ಹೆಸರು, ಇಮೇಲ್, ಮೊಬೈಲ್ ಸಂಖ್ಯೆ), ಬುಕಿಂಗ್‌ಗಾಗಿ ನೀವು ಅಪ್‌ಲೋಡ್ ಮಾಡುವ ಗುರುತು ಮತ್ತು ವ್ಯವಹಾರ ದಾಖಲೆಗಳು (ಆಧಾರ್, ಪ್ಯಾನ್, ಅಥವಾ GST ಪ್ರಮಾಣಪತ್ರದಂತಹವು), ಮತ್ತು ಬುಕಿಂಗ್ ಸಂಬಂಧಿತ ಮಾಹಿತಿ (ನೋಂದಣಿಗಳು, ಪಾವತಿಗಳು, ಇನ್‌ವಾಯ್ಸ್‌ಗಳು ಮತ್ತು ಸಪೋರ್ಟ್ ಸಂದೇಶಗಳು).",
  "privacy.useHeading": "ಇದನ್ನು ಹೇಗೆ ಬಳಸಲಾಗುತ್ತದೆ",
  "privacy.useBody":
    "ನಿಮ್ಮ ಖಾತೆಯನ್ನು ರಚಿಸಲು ಮತ್ತು ನಿರ್ವಹಿಸಲು, ಸ್ಟಾಲ್ ಬುಕಿಂಗ್ ಮತ್ತು ಪಾವತಿಗಳನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲು, ಕಾರ್ಯಕ್ರಮಕ್ಕೆ ಅಗತ್ಯವಿರುವ ದಾಖಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಲು, ಇನ್‌ವಾಯ್ಸ್‌ಗಳನ್ನು ರಚಿಸಲು, ಮತ್ತು ಸಪೋರ್ಟ್ ವಿನಂತಿಗಳಿಗೆ ಪ್ರತಿಕ್ರಿಯಿಸಲು. ಗುರುತಿನ ದಾಖಲೆಗಳನ್ನು ಅಧಿಕೃತ ಕಾರ್ಯಕ್ರಮ ಸಿಬ್ಬಂದಿ ಮಾತ್ರ ಪರಿಶೀಲನಾ ಉದ್ದೇಶಗಳಿಗಾಗಿ ಪರಿಶೀಲಿಸುತ್ತಾರೆ.",
  "privacy.storeHeading": "ಇದನ್ನು ಹೇಗೆ ಸಂಗ್ರಹಿಸಲಾಗುತ್ತದೆ",
  "privacy.storeBody":
    "ಡೇಟಾವನ್ನು Supabase ನೊಂದಿಗೆ ಸಂಗ್ರಹಿಸಲಾಗುತ್ತದೆ, ಪ್ರವೇಶ-ನಿಯಂತ್ರಿತವಾಗಿ ಇರಿಸಲಾಗಿದೆ ಆದ್ದರಿಂದ ನೀವು ನಿಮ್ಮ ಸ್ವಂತ ದಾಖಲೆಗಳನ್ನು ಮಾತ್ರ ನೋಡಬಹುದು (ಅಥವಾ, ಸಿಬ್ಬಂದಿಗೆ, ಅವರ ಪಾತ್ರಕ್ಕೆ ಅಗತ್ಯವಿರುವುದನ್ನು ಮಾತ್ರ). ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ದಾಖಲೆಗಳನ್ನು ಖಾಸಗಿ ಫೈಲ್ ಸ್ಟೋರ್‌ನಲ್ಲಿ ಇರಿಸಲಾಗುತ್ತದೆ, ಎಂದಿಗೂ ಸಾರ್ವಜನಿಕವಾಗಿ ಪ್ರವೇಶಿಸಲಾಗುವುದಿಲ್ಲ.",
  "privacy.choicesHeading": "ನಿಮ್ಮ ಆಯ್ಕೆಗಳು",
  "privacy.choicesBodyPre":
    "ನೀವು ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ಆ್ಯಪ್‌ನಿಂದ ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಅನ್ನು ಪರಿಶೀಲಿಸಬಹುದು ಮತ್ತು ನವೀಕರಿಸಬಹುದು, ಮತ್ತು ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸುವ ಮೂಲಕ ನಿಮ್ಮ ಡೇಟಾಗೆ ಪ್ರವೇಶ ಅಥವಾ ಅಳಿಸುವಿಕೆಯನ್ನು ವಿನಂತಿಸಬಹುದು",
  "privacy.choicesLink": "ಸಂಪರ್ಕ ಪುಟ",
  "privacy.disclaimer":
    "ಈ ಪುಟವು ಸಾಮಾನ್ಯ ಆರಂಭಿಕ ಟೆಂಪ್ಲೇಟ್ ಆಗಿದೆ ಮತ್ತು ಕಾನೂನು ಸಲಹೆ ಅಲ್ಲ. ಈ ಆ್ಯಪ್ ಸರ್ಕಾರಿ ಗುರುತಿನ ದಾಖಲೆಗಳನ್ನು (ಆಧಾರ್‌ನಂತಹ) ಸಂಗ್ರಹಿಸುವುದರಿಂದ, ಇದನ್ನು ಅವಲಂಬಿಸುವ ಮೊದಲು ಭಾರತದ ಡೇಟಾ ಸಂರಕ್ಷಣಾ ನಿಯಮಗಳ ಪರಿಚಯವಿರುವ ವಕೀಲರಿಂದ ಪರಿಶೀಲಿಸಲು ನಾವು ಶಿಫಾರಸು ಮಾಡುತ್ತೇವೆ.",
};

export const DICTS: Record<Locale, Dict> = { en, hi, kn };

export function translate(locale: Locale, key: string, vars?: Record<string, string>): string {
  let value = DICTS[locale]?.[key] ?? DICTS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
  }
  return value;
}
