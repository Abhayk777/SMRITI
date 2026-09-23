/**
 * Canonical translation catalogue type contract for the Smriti caregiver web application.
 *
 * English (`web/src/i18n/locales/en.ts`) is the reference implementation.
 * All target locales must provide matching keys.
 */

export interface TranslationCatalogue {
  nav: {
    today: string
    trends: string
    engagement: string
    messages: string
    report: string
    careGuide: string
    manage: string
    people: string
    medicines: string
    routine: string
    alerts: string
    access: string
    tablet: string
  }
  account: {
    ariaLabel: string
    allPatients: string
    addPatient: string
    signOut: string
    language: string
  }
  common: {
    loadingApp: string
    loading: string
    tryAgain: string
    back: string
    cancel: string
    save: string
    saving: string
    saved: string
    close: string
    delete: string
    selectName: string
    signingIn: string
    findingFamily: string
    chart: string
    numbers: string
    editName: string
    removeName: string
    viewName: string
    photoOf: string
    loadingLabel: string
    playVoice: string
    loadingVoice: string
    voiceLoadFailed: string
  }
  error: {
    permissionTitle: string
    permissionDetail: string
    genericTitle: string
    unknown: string
  }
  format: {
    morning: string
    afternoon: string
    evening: string
    night: string
  }
  device: {
    eyebrow: string
    title: string
    description: string
    checkNow: string
    lastHeard: string
    appVersion: string
    awaitingFirstSync: string
    contentVersion: string
    waitingToUpload: string
    eventsWaiting: string
    clockDifference: string
    offlineNotice: string
    pendingEventsNotice: string
    connectTablet: string
    connectDifferentTablet: string
    connectedTabletNotice: string
    caregiverOnlyNotice: string
    health: {
      ok: { label: string; detail: string }
      stale: { label: string; detail: string }
      offline: { label: string; detail: string }
      paired: { label: string; detail: string }
      never: { label: string; detail: string }
    }
  }
  voicebot: {
    name: string
    caregiverOnly: string
    unavailableError: string
    turnOn: string
    turnOff: string
    tryAgain: string
    lastUpdated: string
    autoChecking: string
    languageReady: string
    languagePending: string
    status: {
      ready: { title: string; body: string }
      pending: { title: string; body: string }
      syncing: { title: string; body: string }
      error: { title: string; body: string }
      unavailable: { title: string; body: string }
      off: { title: string; body: string }
    }
  }
  sky: {
    dawn: string
    day: string
    dusk: string
    night: string
    where: string
  }
  people: {
    eyebrow: string
    title: string
    description: string
    addSomeone: string
    viewOnly: string
    editPerson: string
    editThisPerson: string
    addFirstPerson: string
    nobodyYet: string
    emptyDescription: string
    passedAway: string
    voiceRecorded: string
    voiceRecordingFor: string
    removeTitle: string
    removeDescription: string
    keep: string
    removing: string
    remove: string
    form: {
      photo: string
      name: string
      relationship: string
      relationshipHint: string
      memoryPrompt: string
      memoryHint: string
      voice: string
      voicePrompt: string
      deceased: string
      deceasedHint: string
      nameRequired: string
      relationshipRequired: string
      photoRequired: string
      namePlaceholder: string
      relationshipPlaceholder: string
      memoryPlaceholder: string
    }
  }
  access: {
    eyebrow: string
    title: string
    description: string
    caregiver: { label: string; body: string }
    family: { label: string; body: string }
    healthWorker: { label: string; body: string }
    you: string
    added: string
    addUser: string
    addUserDescription: string
    phone: string
    role: string
    familyOption: string
    caregiverOption: string
    pending: string
    addedNotice: string
    adding: string
    addAccess: string
    caregiverOnly: string
    phoneError: string
  }
  medicineWindow: {
    acceptableTime: string
    acceptableHint: string
    windowAriaLabel: string
    reminderTime: string
    reminderHint: string
    reminderAriaLabel: string
  }
  medicines: {
    eyebrow: string
    title: string
    description: string
    scan: string
    add: string
    addByHand: string
    viewOnly: string
    scanHint: string
    edit: string
    editThis: string
    noMedicines: string
    noMedicinesDescription: string
    anyTime: string
    voiceRecordingFor: string
    stopTitle: string
    stopDescription: string
    keep: string
    stopping: string
    stop: string
    form: {
      name: string
      dose: string
      doseHint: string
      days: string
      media: string
      photo: string
      photoHint: string
      voicePrompt: string
      nameError: string
      doseError: string
      daysError: string
      namePlaceholder: string
      dosePlaceholder: string
    }
  }
  routine: {
    eyebrow: string
    title: string
    description: string
    add: string
    orientationNotice: string
    edit: string
    emptyTitle: string
    emptyDescription: string
    addFirst: string
    form: { label: string; time: string; picture: string; labelError: string; placeholder: string }
    icons: { tea: string; meal: string; walk: string; phone: string; bath: string; prayer: string; rest: string; exercise: string; visitor: string; sleep: string }
  }
  ocr: {
    invalidFile: string
    imagePreparationFailed: string
    fileTooLarge: string
    fileReadFailed: string
    title: string
    description: string
    scan: string
    reading: string
    unreadable: string
    notScheduled: string
    noLines: string
    chooseAnother: string
    discard: string
    typeItIn: string
    chimeAt: string
    done: string
    changeTime: string
    multipleDoses: string
    media: string
    photoHint: string
    confirmChecked: string
    confirmUnchecked: string
    save: string
    allChecked: string
    linesOutstanding: string
    skippedLines: string
    confidence: { high: string; highHelp: string; low: string; lowHelp: string; unrecognized: string; unrecognizedHelp: string; sure: string }
  }
  messages: {
    tags: { memory: string; checkIn: string; message: string; prompt: string }
    eyebrow: string
    title: string
    unreadDescription: string
    description: string
    emptyTitle: string
    emptyDescription: string
    play: string
    pause: string
    new: string
    noTranscript: string
    fetching: string
    loadFailed: string
    playbackFailed: string
    markReadFailed: string
    viewOnly: string
  }
  recorder: {
    microphoneError: string
    record: string
    recordAgain: string
    stop: string
    saved: string
    remove: string
    uploading: string
    uploadFailed: string
  }
  photo: { label: string; uploading: string; saved: string; remove: string; add: string; choose: string; change: string; hint: string; uploadFailed: string }
  pairing: {
    title: string
    description: string
    generating: string
    generate: string
    readOut: string
    expired: string
    expiresIn: string
    singleUse: string
    generateNew: string
    codeAria: string
    copied: string
    copy: string
  }
  auth: {
    brandMeaning: string
    welcomeTitle: string
    welcomeDescription: string
    demoNotice: string
    signIn: string
    signInDescription: string
    googleOpening: string
    continueWithGoogle: string
    orMobile: string
    mobileNumber: string
    countryCodeHint: string
    sendCode: string
    sending: string
    differentNumber: string
    enterCode: string
    codeSent: string
    sixDigitCode: string
    checking: string
    resendIn: string
    resend: string
    phoneRequired: string
    phoneInvalid: string
    otpInvalid: string
    sendFailed: string
    verifyFailed: string
    googleFailed: string
  }
  careGuide: {
    eyebrow: string
    title: string
    description: string
    safetyNotice: string
    stillStuck: string
    stillStuckBody: string
    sections: Array<{ title: string; body: string[] }>
  }
  report: {
    eyebrow: string
    title: string
    description: string
    generate: string
    covering: string
    pdfUnavailableTitle: string
    pdfUnavailable: string
    pdfNotice: string
    summaryTitle: string
    summaryDescription: string
    medicines: string
    sessions: string
    nothingScheduled: string
    dosesConfirmed: string
    minutesTotal: string
    answersCorrect: string
    days: string
    range1: string
    range3: string
    range6: string
    range12: string
  }
  alerts: {
    title: string
    description: string
    orderTitle: string
    noLadder: string
    onTime: string
    minutesAfter: string
    tabletChimes: string
    noResponse: string
    timingsNotice: string
    contactsTitle: string
    contactsDescription: string
    viewOnly: string
    firstCall: string
    secondCall: string
    secondCallHint: string
    name: string
    phone: string
    saveContacts: string
    primaryNameError: string
    primaryPhoneError: string
    secondaryPhoneError: string
  }
  setup: {
    steps: { basics: string; people: string; voices: string; medicines: string; routine: string; alerts: string; pairing: string }
    step: string; profileNotCreated: string; firstStep: string; back: string; skip: string
    basics: { title: string; description: string; name: string; nameHint: string; age: string; schooling: string; language: string; timezone: string; timezoneHint: string; missedDoseTitle: string; missedDoseDescription: string; namePlaceholder: string; contactPlaceholder: string; phone: string; creating: string; create: string; nameError: string; ageError: string; schoolingError: string; contactError: string; phoneError: string }
    people: { title: string; description: string; add: string; addAnother: string; remove: string; skip: string; next: string }
    voices: { title: string; description: string; noneTitle: string; noneDescription: string; prompt: string; next: string }
    medicines: { title: string; description: string; scanHint: string; add: string; addAnother: string; remove: string; next: string }
    routine: { title: string; description: string; add: string; addAnother: string; remove: string; next: string }
    alerts: { title: string; description: string; firstCall: string; secondCall: string; secondCallHint: string; name: string; phone: string; next: string; primaryNameError: string; primaryPhoneError: string; secondaryPhoneError: string }
    pairing: { title: string; description: string; fallbackName: string; noTablet: string; manageTablet: string; finish: string; loadingNamed: string; loading: string }
  }
  dashboard: { description: string; notices: string; today: string; dayTitle: string; checkTablet: string; medicines: string; noMedsToday: string; allConfirmed: string; unconfirmed: string; timeTogether: string; noTime: string; sessions: string; noSession: string; messagesWaiting: string; noMessages: string; medicinesToday: string; manage: string; addMedicine: string; noMedicines: string; noMedicinesDescription: string; medicineNote: string; routineTitle: string; addRoutine: string; noRoutine: string; noRoutineDescription: string; routineNote: string; newFrom: string; fallbackMemo: string; recorded: string; listen: string }
  trends: { eyebrow: string; title: string; description: string; rangeDays: string; notices: string; noData: string; noDataDescription: string; accuracyTitle: string; accuracyReading: string; thatDay: string; sevenDay: string; change: string; day: string; correct: string; changeLabel: string; domainTitle: string; domainDescription: string; noDomain: string; noDomainDescription: string; points: string; percentCorrect: string; comingSoon: string; comingSoonNotice: string; recognitionTitle: string; recognitionDescription: string; retentionTitle: string; retentionDescription: string; timeOfDay: string; afternoonsDescription: string; unavailable: string }
  engagement: { eyebrow: string; title: string; description: string; rangeDays: string; sessionsAria: string; noSession: string; less: string; more: string; daysSession: string; daysPeriod: string; noDays: string; tabletTime: string; minutes: string; sessions: string; leftEarly: string; finished: string; unfinished: string; confirmed: string; noScheduled: string; doses: string; noData: string; noDataDescription: string; dosesTitle: string; dosesReading: string; onTablet: string; afterCall: string; notConfirmed: string; weekOf: string; minutesTitle: string; minutesReading: string; calendarTitle: string; calendarReading: string }
  flags: { decline: { title: string; body: string }; engagementDrop: { title: string; body: string }; adherenceDrop: { title: string; body: string }; deviceOffline: { title: string; body: string }; patternMismatch: { title: string; body: string }; info: string; moderate: string; high: string; clearing: string; seen: string; clearFailed: string; evidence: string; changeStart: string; confidence: string; confidenceValue: string; compared: string; recent: string; usualByArea: string; basedOn: string; sessions: string }
  patientRoute: { checkingAccess: string; noAccessTitle: string; noAccessDescription: string; backToPatients: string; loadingProfile: string; loadFailed: string }
  identity: { viewOnly: string; switchAria: string; switchPatient: string; flags: string; playedToday: string; noActivity: string }
  domains: { memory: string; attention: string; executive: string; visuospatial: string; language: string }
  overview: { flags: string; newMessages: string; playedToday: string; noSession: string; allMedicines: string; medicinesMissed: string; deleteAria: string; deleteTitle: string; morning: string; afternoon: string; evening: string; careOverview: string; quickRead: string; overviewDescription: string; offlineDevices: string; newMessagesTitle: string; needsAttention: string; playedTodayTitle: string; addPatient: string; everyone: string; loading: string; attentionSummary: string; allOnTrack: string; searchAria: string; searchPlaceholder: string; selectAll: string; deleteChosen: string; noMatches: string; deleteOneTitle: string; deleteManyTitle: string; deleteOneDescription: string; deleteManyDescription: string; cannotUndo: string; deleting: string; deleteCompletely: string }
  marketing: { how: string; features: string; stories: string; getStarted: string; heroTitle: string; heroBody: string; startTrial: string; seeHow: string; heroFootnote: string; skipIntro: string; scrollHow: string; featureEyebrow: string; featureTitle: string; previous: string; next: string; slide1Kicker: string; slide1Title: string; slide1Body: string; slide2Kicker: string; slide2Title: string; slide2Body: string; slide3Kicker: string; slide3Title: string; slide3Body: string; slide4Kicker: string; slide4Title: string; slide4Body: string; howTitle: string; howBody: string; step1Title: string; step1Body: string; step2Title: string; step2Body: string; step3Title: string; step3Body: string; stat1: string; stat2: string; stat3: string; stat4: string; yourSide: string; previewTitle: string; previewBody: string; promise1: string; promise2: string; promise3: string; tour: string; storiesTitle: string; storiesHeading: string; story1: string; story1Where: string; story2: string; story2Where: string; story3: string; story3Where: string; ctaTitle: string; ctaBody: string; talk: string; noCard: string; looms: string; product: string; pricing: string; download: string; care: string; setupWithUs: string; help: string; privacy: string; familyStories: string; company: string; about: string; careers: string; contact: string; footerMeaning: string }
  marketingPreview: { date: string; status: string; summary: string; checkIn: string; checkInDetail: string; medicine: string; medicineDetail: string; walk: string; walkDetail: string; memory: string; memoryDetail: string; copyright: string; motifs: string }
}

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
  ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
  : `${Key}`
}[keyof ObjectType & (string | number)]

export type TranslationKey = NestedKeyOf<TranslationCatalogue>
