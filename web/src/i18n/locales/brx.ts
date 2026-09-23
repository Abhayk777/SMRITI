/**
 * Foundation draft translation catalogue for Bodo (brx).
 *
 * Status: Foundation draft (LI-01). Not yet validated by native reviewer (LI-03)
 * or release-ready. Does not confer voice or telephony capabilities.
 */

import type { TranslationCatalogue } from '../keys.ts'
import { en } from './en.ts'

export const brx: TranslationCatalogue = {
  nav: {
    today: 'दिनै',
    trends: 'दावगानाय',
    engagement: 'बाहागो',
    messages: 'खौरां',
    report: 'फोरमायथि',
    careGuide: 'जथोन',
    manage: 'सामलायनाय',
    people: 'सुबुंफोर',
    medicines: 'मुलि',
    routine: 'दान्दिफोर',
    alerts: 'सांग्रांथि',
    access: 'हाबनाय',
    tablet: 'टैबलेट',
  },
  account: {
    ariaLabel: 'एकाउन्ट',
    allPatients: 'गासैबो सुबुं',
    addPatient: 'गोदान सुबुं सोदेर',
    signOut: 'साइन आउट',
    language: 'राव',
  },
  common: {
    loadingApp: 'स्मृति लोड जाबाय दं…',
    loading: 'लोड जाबाय दं…',
    tryAgain: 'फिन नाजा',
    back: 'उनफारसे',
    cancel: 'बातिल खालाम',
    save: 'दोनथुम',
    saving: 'दोनथुमबाय दं…',
    saved: 'दोनथुमबाय।',
    close: 'बन्द खालाम',
    delete: 'हुखुमोर',
    selectName: en.common.selectName,
    signingIn: en.common.signingIn, findingFamily: en.common.findingFamily, chart: en.common.chart, numbers: en.common.numbers,
    editName: en.common.editName, removeName: en.common.removeName, viewName: en.common.viewName, photoOf: en.common.photoOf, loadingLabel: en.common.loadingLabel,
    playVoice: en.common.playVoice, loadingVoice: en.common.loadingVoice, voiceLoadFailed: en.common.voiceLoadFailed,
  },
  error: {
    permissionTitle: 'नोंनाव हाबनाय गैया',
    permissionDetail:
      'बे प्रोफाइलखौ सोरजिनिफ्राय सोदेरनो थिन, एबा थार नम्बरजों साइन इन जादों ना नाय।',
    genericTitle: 'लोड खालामनो हायासै',
    unknown: 'मोनसे गोरोन्थि जादों।',
  },
  format: {
    morning: 'फुं',
    afternoon: 'सानजुफु',
    evening: 'बेलासियाव',
    night: 'हर',
  },
  device: {
    eyebrow: 'सामलायनाय', title: 'टैबलेट', description: '{name} नि टैबलेटआ स्मृतिजों फोनायो ना आरो दा मा सालायगासिनो दं।', checkNow: 'दानो नाय', lastHeard: 'जोबथा खौरां {time}.', appVersion: 'एप भर्सन', awaitingFirstSync: 'गिबि सिन्कनि थाखाय नेवसिगासिनो दं', contentVersion: 'कन्टेन्ट भर्सन', waitingToUpload: 'आपलोड खालामनो नेवसिगासिनो दं', eventsWaiting: '{count} इभेन्ट{suffix}', clockDifference: 'घरि फरक', offlineNotice: 'टैबलेट अफलाइन थाखाय जाथांबायबो लोकल रिमाइन्डार आरो साउन्दफोरा सोलिगासिनो थायो। फोनायनो फिन मोनफिननायनि सिगां सिन्क आरो आपडेटफोरा बन्द जादों।', pendingEventsNotice: 'टैबलेटआव {count} बेसाद{suffix} दैथायो। कनिक्सन मोनब्ला बेयाव गावनो गावै फुरायगोन।', connectTablet: 'टैबलेट फोनाय', connectDifferentTablet: 'गुबुन टैबलेट फोनाय', connectedTabletNotice: 'बे प्रोफाइलजों मोनसे टैबलेट सिगांनो फोनायबाय। गोदान कडआ बेखौ सोलायनो नङा।', caregiverOnlyNotice: 'बे प्रोफाइलआव जथोन होग्रा मोनसेनो टैबलेट फोनाय एबा सोलायनो हायो।',
    health: {
      ok: { label: 'फोनायबाय', detail: 'टैबलेटआ फोनायबाय आरो दासान्दि खौरां होबाय।' }, stale: { label: 'नायनाय नांगौ', detail: 'टैबलेटआ दासान्दि खौरां होआखै।' }, offline: { label: 'अफलाइन', detail: 'टैबलेटआ सम खिनि अफलाइनआव दं।' }, paired: { label: 'पेयাৰ खालामबाय', detail: 'टैबलेटआ पेयাৰ खालामबाय आरो गिबि खौरांनि थाखाय नेवसिगासिनो दं।' }, never: { label: 'फोनायाखै', detail: 'बे प्रोफाइलनि थाखाय जेबो टैबलेटा दासिमबो खौरां होआखै।' },
    },
  },
  voicebot: {
    name: 'भइस असिस्टेन्ट', caregiverOnly: 'भइस असिस्टेन्टनि सेटिंफोरा जथोन होग्रामोननि थाखायनो। सोदोब आरो भइस रेकर्डिंफोरा टैबलेटआव प्राइभेट थायो।', unavailableError: 'भइस असिस्टेन्टनि थाथाइ मोननो हायाखै।', turnOn: 'अन खालाम', turnOff: 'अफ खालाम', tryAgain: 'फिन नाजा', lastUpdated: 'जोबथा आपडेट {time}.', autoChecking: 'जायगाय दंमानि समाव बे बिलाइआ गावनो गावै फिन नायगोन।', languageReady: 'टैबलेट इन्टिग्रेसन अन जाब्ला {language} नि थाखाय मोनगोन।', languagePending: 'रावनि भइस सपर्टखौ दासिमबो लाइभ बाहायनो थाखाय गनायखौनो हाया। दानि टैबलेट रिमाइन्डार आरो जथोन फिचारफोरा सोलिगासिनो थागोन।',
    status: {
      ready: { title: 'टैबलेटआव जायगा जायो', body: 'भइस असिस्टेन्टआव गनायथारबाय सुबुंफोर, मुलि आरो दान्दिफोरनि गोदान फारिलाइ दं।' }, pending: { title: 'जायगा खालामगासिनो', body: 'स्मृतिया टैबलेटनि थाखाय गनायथारबाय फारिलाइ जायगा खालामगासिनो।' }, syncing: { title: 'असिस्टेन्टखौ आपडेट खालामगासिनो', body: 'गोदान गनायथारबाय फारिलाइ रैखाथि जों दैथायगासिनो।' }, error: { title: 'फिन नाजानाय नांगौ', body: 'टैबलेट असिस्टेन्टआ आपडेट खालामनो हायाखै। नोंथांनि जथोन फारिलाइ नर्मेल महरै दोनथुमबाय।' }, unavailable: { title: 'सम खिनि मोननो हायाखै', body: 'भइस असिस्टेन्ट मोननो हायाखै। टैबलेट रिमाइन्डार आरो गुबुन जथोन फिचारफोरा सोलिगोन।' }, off: { title: 'अन खालामाखै', body: 'फोनायबाय टैबलेटआ भइस असिस्टेन्ट बाहायनो लुब्ला बेखौ अन खालाम।' },
    },
  },
  sky: {
    dawn: 'फुंनि सम', day: 'साननि सम', dusk: 'बेलासियाव', night: 'हर', where: '{name} दंनाय जायगायाव {phase}',
  },
  people: en.people,
  access: en.access,
  medicineWindow: en.medicineWindow,
  medicines: en.medicines,
  routine: en.routine,
  ocr: en.ocr,
  messages: en.messages,
  recorder: en.recorder,
  photo: en.photo,
  pairing: en.pairing,
  auth: en.auth,
  careGuide: en.careGuide,
  report: en.report,
  alerts: en.alerts,
  setup: en.setup,
  dashboard: en.dashboard, trends: en.trends, engagement: en.engagement,
  flags: en.flags, patientRoute: en.patientRoute,
  identity: en.identity, domains: en.domains,
  overview: en.overview,
  marketing: en.marketing,
  marketingPreview: en.marketingPreview,
}
