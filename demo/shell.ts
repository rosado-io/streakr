import { version } from "../package.json";

const REPO_URL = "https://github.com/rosado-io/streakr";
const NPM_URL = "https://www.npmjs.com/package/@rosado-io/streakr";
export const INSTALL_CMD = "npm i @rosado-io/streakr";

type SourceCard = { key: string; name: string; kind: string; note: string };

const sourceCard = (key: string, name: string, note: string): SourceCard => ({
  key,
  name,
  kind: "Visual preset",
  note,
});

const SOURCES: SourceCard[] = [
  sourceCard(
    "github",
    "GitHub",
    "Render counts from GitHub when your data uses the github source key.",
  ),
  sourceCard(
    "gitlab",
    "GitLab",
    "Display GitLab activity from your API, snapshot, database, or build.",
  ),
  sourceCard(
    "bitbucket",
    "Bitbucket",
    "Use the built-in Bitbucket color and icon with data you provide.",
  ),
  sourceCard(
    "claude",
    "Claude",
    "Attribute activity to Claude after your own pipeline classifies it.",
  ),
  sourceCard("codex", "Codex", "Give Codex its own source count, color, icon, and toggle."),
  sourceCard(
    "opencode",
    "opencode",
    "Present opencode activity without coupling Streakr to your collector.",
  ),
  sourceCard(
    "copilot",
    "Copilot",
    "Present Copilot counts from whichever acquisition flow you trust.",
  ),
  sourceCard("kimi", "Kimi", "Attribute activity to Kimi after your own pipeline classifies it."),
  sourceCard(
    "antigravity",
    "Antigravity",
    "Give Antigravity its own source count, color, icon, and toggle.",
  ),
];

const SOURCE_ICONS: Record<string, string> = {
  github:
    '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>',
  gitlab:
    '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 14.7L10.95 5.6H5.05L8 14.7z" fill="#e24329"/><path d="M8 14.7L5.05 5.6H.92L8 14.7z" fill="#fc6d26"/><path d="M.92 5.6L.02 8.36c-.08.25 0 .53.22.69L8 14.7.92 5.6z" fill="#fca326"/><path d="M.92 5.6h4.13L3.27.1c-.09-.27-.48-.27-.57 0L.92 5.6z" fill="#e24329"/><path d="M8 14.7l2.95-9.1h4.13L8 14.7z" fill="#fc6d26"/><path d="M15.08 5.6l.9 2.76c.08.25 0 .53-.22.69L8 14.7l7.08-9.1z" fill="#fca326"/><path d="M15.08 5.6h-4.13L12.73.1c.09-.27.48-.27.57 0l1.78 5.5z" fill="#e24329"/></svg>',
  bitbucket:
    '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M.51 1.18c-.27 0-.51.24-.51.51 0 .03 0 .07.01.1l2.18 13.17c.06.36.37.62.74.63h10.46c.27 0 .51-.2.55-.47l2.18-13.32a.512.512 0 00-.41-.59L.6 1.18zm9.13 9.42H6.4l-.88-4.55h4.92l-.8 4.55z" fill="#2684ff"/></svg>',
  claude:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="#d97757"><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg>',
  codex:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>',
  opencode:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22 24H2V0h20zM17 4.8H7v14.4h10z"/></svg>',
  copilot:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff"><path d="M23.922 16.997C23.061 18.492 18.063 22.02 12 22.02 5.937 22.02.939 18.492.078 16.997A.641.641 0 0 1 0 16.741v-2.869a.883.883 0 0 1 .053-.22c.372-.935 1.347-2.292 2.605-2.656.167-.429.414-1.055.644-1.517a10.098 10.098 0 0 1-.052-1.086c0-1.331.282-2.499 1.132-3.368.397-.406.89-.717 1.474-.952C7.255 2.937 9.248 1.98 11.978 1.98c2.731 0 4.767.957 6.166 2.093.584.235 1.077.546 1.474.952.85.869 1.132 2.037 1.132 3.368 0 .368-.014.733-.052 1.086.23.462.477 1.088.644 1.517 1.258.364 2.233 1.721 2.605 2.656a.841.841 0 0 1 .053.22v2.869a.641.641 0 0 1-.078.256Zm-11.75-5.992h-.344a4.359 4.359 0 0 1-.355.508c-.77.947-1.918 1.492-3.508 1.492-1.725 0-2.989-.359-3.782-1.259a2.137 2.137 0 0 1-.085-.104L4 11.746v6.585c1.435.779 4.514 2.179 8 2.179 3.486 0 6.565-1.4 8-2.179v-6.585l-.098-.104s-.033.045-.085.104c-.793.9-2.057 1.259-3.782 1.259-1.59 0-2.738-.545-3.508-1.492a4.359 4.359 0 0 1-.355-.508Zm2.328 3.25c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm-5 0c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm3.313-6.185c.136 1.057.403 1.913.878 2.497.442.544 1.134.938 2.344.938 1.573 0 2.292-.337 2.657-.751.384-.435.558-1.15.558-2.361 0-1.14-.243-1.847-.705-2.319-.477-.488-1.319-.862-2.824-1.025-1.487-.161-2.192.138-2.533.529-.269.307-.437.808-.438 1.578v.021c0 .265.021.562.063.893Zm-1.626 0c.042-.331.063-.628.063-.894v-.02c-.001-.77-.169-1.271-.438-1.578-.341-.391-1.046-.69-2.533-.529-1.505.163-2.347.537-2.824 1.025-.462.472-.705 1.179-.705 2.319 0 1.211.175 1.926.558 2.361.365.414 1.084.751 2.657.751 1.21 0 1.902-.394 2.344-.938.475-.584.742-1.44.878-2.497Z"/></svg>',
  kimi: '<svg viewBox="132.3 99.3 759.4 759.4" width="16" height="16"><path fill="currentColor" d="M436.30592 518.10304l236.78976-234.94656c4.46464-4.42368 1.96608-13.35296-3.80928-13.35296h-127.3856a5.3248 5.3248 0 0 0-3.80928 1.6384l-255.1808 253.1328c-3.97312 3.8912-9.8304.4096-9.8304-5.89824V277.2992c0-4.13696-2.74432-7.49568-6.06208-7.49568H179.24096c-3.35872 0-6.06208 3.35872-6.06208 7.49568v520.47872c0 4.096 2.70336 7.49568 6.02112 7.49568H267.0592c3.31776 0 6.06208-3.35872 6.06208-7.49568v-106.0864c0-2.21184.8192-4.38272 2.2528-5.81632l79.09376-78.47936a5.16096 5.16096 0 0 1 6.67648-.73728l211.5584 155.648c34.65216 23.3472 73.35936 37.6832 112.68096 41.90208 3.52256.4096 6.5536-3.11296 6.5536-7.49568v-99.86048c0-3.80928-2.29376-6.92224-5.36576-7.3728a164.0448 164.0448 0 0 1-66.1504-26.33728l-183.17312-132.62848c-3.80928-2.53952-4.25984-9.09312-.90112-12.41088z"/><path fill="#1883ff" d="M788.0704 152.69888a62.75072 62.75072 0 1 1 0 125.50144H732.7744a7.3728 7.3728 0 0 1-7.3728-7.3728V215.4496c0-34.65216 28.0576-62.75072 62.70976-62.75072z"/></svg>',
  antigravity:
    '<svg viewBox="13 15 85 85" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M89.6992 93.695C94.3659 97.195 101.366 94.8617 94.9492 88.445C75.6992 69.7783 79.7825 18.445 55.8659 18.445C31.9492 18.445 36.0325 69.7783 16.7825 88.445C9.78251 95.445 17.3658 97.195 22.0325 93.695C40.1159 81.445 38.9492 59.8617 55.8659 59.8617C72.7825 59.8617 71.6159 81.445 89.6992 93.695Z" fill="#3186FF"/><mask id="mask0_ag16" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="13" y="18" width="85" height="78"><path d="M89.6992 93.695C94.3659 97.195 101.366 94.8617 94.9492 88.445C75.6992 69.7783 79.7825 18.445 55.8659 18.445C31.9492 18.445 36.0325 69.7783 16.7825 88.445C9.78251 95.445 17.3658 97.195 22.0325 93.695C40.1159 81.445 38.9492 59.8617 55.8659 59.8617C72.7825 59.8617 71.6159 81.445 89.6992 93.695Z" fill="black"/></mask><g mask="url(#mask0_ag16)"><g filter="url(#filter0_ag16)"><ellipse cx="22.7873" cy="26.8098" rx="22.7873" ry="26.8098" transform="matrix(-0.112784 0.99362 -0.99362 -0.112781 66.2473 -15.5344)" fill="#FFE432"/></g><g filter="url(#filter1_ag16)"><ellipse cx="96.491" cy="35.1231" rx="29.5007" ry="30.1492" transform="rotate(76.9243 96.491 35.1231)" fill="#FC413D"/></g><g filter="url(#filter2_ag16)"><ellipse cx="9.02988" cy="41.6647" rx="30.832" ry="39.9417" transform="rotate(74.1257 9.02988 41.6647)" fill="#00B95C"/></g><g filter="url(#filter3_ag16)"><ellipse cx="11.2212" cy="42.8915" rx="30.22" ry="33.2695" transform="rotate(45.6065 11.2212 42.8915)" fill="#00B95C"/></g><g filter="url(#filter4_ag16)"><ellipse cx="75.7546" cy="104.822" rx="29.0177" ry="27.943" transform="rotate(76.9243 75.7546 104.822)" fill="#3186FF"/></g><g filter="url(#filter5_ag16)"><ellipse cx="33.5661" cy="35.4043" rx="33.5661" ry="35.4043" transform="matrix(-0.409539 0.912293 -0.912294 -0.409537 101.25 -15.1674)" fill="#FBBC04"/></g><g filter="url(#filter6_ag16)"><path d="M2.56802 149.695C-15.8116 142.48 15.5987 83.1163 23.4093 63.2203C31.22 43.3244 52.4514 33.0447 70.831 40.26C89.2107 47.4753 110.996 87.2162 103.185 107.112C95.3742 127.008 20.9477 156.91 2.56802 149.695Z" fill="#3186FF"/></g><g filter="url(#filter7_ag16)"><path d="M113.934 75.8079C109.013 81.5509 96.1724 78.6224 85.253 69.2667C74.3335 59.911 69.4704 47.6711 74.391 41.928C79.3116 36.185 92.1525 39.1136 103.072 48.4692C113.991 57.8249 118.855 70.0648 113.934 75.8079Z" fill="#749BFF"/></g><g filter="url(#filter8_ag16)"><ellipse cx="92.611" cy="23.7962" rx="44.2411" ry="27.5016" transform="rotate(34.0763 92.611 23.7962)" fill="#FC413D"/></g><g filter="url(#filter9_ag16)"><ellipse cx="23.4949" cy="29.5887" rx="23.7071" ry="13.7869" transform="rotate(112.516 23.4949 29.5887)" fill="#FFEE48"/></g></g><defs><filter id="filter0_ag16" x="2.49348" y="-26.5423" width="69.0899" height="61.2525" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="3.89034" result="effect1_foregroundBlur"/></filter><filter id="filter1_ag16" x="28.7524" y="-32.0333" width="135.477" height="134.313" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="18.8078" result="effect1_foregroundBlur"/></filter><filter id="filter2_ag16" x="-62.2884" y="-21.9253" width="142.637" height="127.18" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="15.9884" result="effect1_foregroundBlur"/></filter><filter id="filter3_ag16" x="-52.5697" y="-20.8346" width="127.582" height="127.452" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="15.9884" result="effect1_foregroundBlur"/></filter><filter id="filter4_ag16" x="17.3619" y="45.4646" width="116.786" height="118.715" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="15.1937" result="effect1_foregroundBlur"/></filter><filter id="filter5_ag16" x="-7.44765" y="-60.4737" width="125.303" height="122.858" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="13.7698" result="effect1_foregroundBlur"/></filter><filter id="filter6_ag16" x="-27.7086" y="13.3597" width="157.119" height="162.029" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="12.297" result="effect1_foregroundBlur"/></filter><filter id="filter7_ag16" x="50.4638" y="16.981" width="87.3973" height="83.7738" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="11.0036" result="effect1_foregroundBlur"/></filter><filter id="filter8_ag16" x="34.2604" y="-28.457" width="116.701" height="104.506" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="9.29385" result="effect1_foregroundBlur"/></filter><filter id="filter9_ag16" x="-15.1522" y="-15.9493" width="77.2941" height="91.076" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="11.5027" result="effect1_foregroundBlur"/></filter></defs></svg>',
};

const PILLARS: { n: string; t: string; d: string }[] = [
  {
    n: "01",
    t: "One explicit contract",
    d: "Pass YYYY-MM-DD, count, and optional source counts. Streakr validates them before drawing.",
  },
  {
    n: "02",
    t: "You own acquisition",
    d: "Fetch on a server, read a snapshot, query your database, or build the array locally.",
  },
  {
    n: "03",
    t: "Recipes when useful",
    d: "Start from an official recipe, copy it into your app, and change every detail you need.",
  },
];

const RECORDS: { label: string; note: string }[] = [
  {
    label: "Total Contributions",
    note: "Sum of every enabled source across the selected year.",
  },
  {
    label: "Best Streak",
    note: "Longest unbroken run of days with at least one contribution.",
  },
  {
    label: "Current Streak",
    note: "Counted backwards from today — the card swaps in Active Rate for past years.",
  },
  {
    label: "Active Days",
    note: "Days with any contribution from an enabled source.",
  },
];

const HERO_FACTS: { k: string; v: string }[] = [
  { k: "Bundle", v: "ESM + 1 CSS file" },
  { k: "Runtime deps", v: "0" },
  { k: "Data contract", v: "1 serializable shape" },
  { k: "Layouts", v: "heatmap + ring" },
  { k: "License", v: "MIT" },
];

const MOUNT_TAIL = [
  "",
  "// mount",
  "import { createStreakr } from '@rosado-io/streakr'",
  "import '@rosado-io/streakr/styles.css'",
  "",
  "createStreakr({",
  "  target: document.querySelector('#streakr'),",
  "  theme: 'dark',",
  "  years: [2024, 2025, 2026],",
  "  days: activity,",
  "})",
].join("\n");

export const INSTALL_SNIPPETS: Record<string, string> = {
  npm: `# install\nnpm install @rosado-io/streakr\n${MOUNT_TAIL}`,
  pnpm: `# install\npnpm add @rosado-io/streakr\n${MOUNT_TAIL}`,
  yarn: `# install\nyarn add @rosado-io/streakr\n${MOUNT_TAIL}`,
  cdn: [
    "<!-- stylesheet -->",
    `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rosado-io/streakr@${version}/dist/streakr.css">`,
    "",
    "<!-- module -->",
    '<script type="module">',
    `  import { createStreakr } from 'https://cdn.jsdelivr.net/npm/@rosado-io/streakr@${version}/dist/streakr.js'`,
    "",
    "  createStreakr({",
    "    target: document.querySelector('#streakr'),",
    "    theme: 'dark',",
    "    years: [2024, 2025, 2026],",
    "    days: activity,",
    "  })",
    "</" + "script>",
  ].join("\n"),
};

export const RECIPE_SNIPPETS: Record<string, string> = {
  github: [
    "// recipe: adapt a public GitHub calendar response",
    "const response = await fetch(",
    "  'https://github-contributions-api.jogruber.de/v4/octocat?y=2026'",
    ")",
    "const payload = await response.json()",
    "",
    "const days = payload.contributions.map((day) => ({",
    "  date: day.date,",
    "  count: day.count,",
    "  sources: { github: day.count },",
    "}))",
    "",
    "createStreakr({",
    "  target: document.querySelector('#streakr'),",
    "  years: [2026],",
    "  days,",
    "})",
  ].join("\n"),
  local: [
    "// your own endpoint, cache, auth, and error policy",
    "const response = await fetch('/api/activity?year=2026')",
    "const days = await response.json()",
    "",
    "createStreakr({",
    "  target: document.querySelector('#streakr'),",
    "  years: [2024, 2025, 2026],",
    "  days,",
    "  sources: [",
    "    { key: 'work', name: 'Work', color: '#39d353' },",
    "    { key: 'personal', name: 'Personal', color: '#4f8cff' },",
    "  ],",
    "})",
  ].join("\n"),
};

const KEYWORDS =
  "import|from|const|let|await|async|function|export|return|new|true|false|null|undefined|npm|pnpm|yarn|bun|add|install|link|rel|href|script|type|stylesheet";

const HIGHLIGHT_RE = new RegExp(
  String.raw`(//[^\n]*|#[^\n]*|'[^']*'|"[^"]*"|\b(${KEYWORDS})\b|\b[A-Za-z_$][\w$]*(?=\())`,
  "g",
);

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char] ?? char);
}

function tokenClass(token: string, isKeyword: boolean): string {
  if (token.startsWith("//") || token.startsWith("#")) return "c-c";
  if (token.startsWith("'") || token.startsWith('"')) return "c-s";
  return isKeyword ? "c-k" : "c-fn";
}

export function highlight(source: string): string {
  return source
    .split("\n")
    .map((line) => {
      let out = "";
      let last = 0;
      let match: RegExpExecArray | null;
      HIGHLIGHT_RE.lastIndex = 0;
      while ((match = HIGHLIGHT_RE.exec(line)) !== null) {
        if (match.index > last) out += escapeHtml(line.slice(last, match.index));
        const token = match[0];
        out += `<span class="${tokenClass(token, Boolean(match[2]))}">${escapeHtml(token)}</span>`;
        last = match.index + token.length;
      }
      if (last < line.length) out += escapeHtml(line.slice(last));
      return out.length ? out : "&nbsp;";
    })
    .join("\n");
}

const GITHUB_MARK =
  '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

export function logoSvg(size = 22): string {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="4" height="4" rx="1" class="lv2-logo-on"/>
      <rect x="7" y="1" width="4" height="4" rx="1" class="lv2-logo-on"/>
      <rect x="13" y="1" width="4" height="4" rx="1" class="lv2-logo-on"/>
      <rect x="1" y="7" width="4" height="4" rx="1" class="lv2-logo-on"/>
      <rect x="7" y="7" width="4" height="4" rx="1" class="lv2-logo-on"/>
      <rect x="13" y="7" width="4" height="4" rx="1" class="lv2-logo-off"/>
      <rect x="1" y="13" width="4" height="4" rx="1" class="lv2-logo-on"/>
      <rect x="7" y="13" width="4" height="4" rx="1" class="lv2-logo-off"/>
      <rect x="13" y="13" width="4" height="4" rx="1" class="lv2-logo-on"/>
    </svg>
  `;
}

const FAVICON_ON: [number, number][] = [
  [4, 4],
  [13, 4],
  [22, 4],
  [4, 13],
  [13, 13],
  [4, 22],
  [22, 22],
];
const FAVICON_OFF: [number, number][] = [
  [22, 13],
  [13, 22],
];

export function faviconSvg(on: string, off: string): string {
  const group = (cells: [number, number][], fill: string): string =>
    `<g fill="${fill}">` +
    cells.map(([x, y]) => `<rect x="${x}" y="${y}" width="6" height="6" rx="1.6"/>`).join("") +
    `</g>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">` +
    `<rect width="32" height="32" rx="7" fill="#0a0a0a"/>` +
    group(FAVICON_ON, on) +
    group(FAVICON_OFF, off) +
    `</svg>`
  );
}

function eyebrow(text: string): string {
  return `<div class="lv2-eyebrow"><span class="lv2-eyebrow-dot"></span><span>${text}</span></div>`;
}

function sourceCards(): string {
  return SOURCES.map(
    (s) => `
      <div class="lv2-source">
        <div class="lv2-source-head">
          <span class="lv2-source-icon">${SOURCE_ICONS[s.key] ?? ""}</span>
          <span class="lv2-source-name">${s.name}</span>
        </div>
        <div class="lv2-source-kind">${s.kind}</div>
        <div class="lv2-source-note">${s.note}</div>
      </div>`,
  ).join("");
}

function pillarCards(): string {
  return PILLARS.map(
    (p) => `
      <div class="lv2-pillar">
        <div class="lv2-pillar-n">${p.n}</div>
        <div class="lv2-pillar-t">${p.t}</div>
        <div class="lv2-pillar-d">${p.d}</div>
      </div>`,
  ).join("");
}

function recordRows(): string {
  return RECORDS.map(
    (r) => `
      <div class="lv2-record">
        <div class="lv2-record-main">
          <div class="lv2-record-label">${r.label}</div>
          <div class="lv2-record-note">${r.note}</div>
        </div>
      </div>`,
  ).join("");
}

function heroFactRows(): string {
  return HERO_FACTS.map(
    (f) => `
      <div class="lv2-fact">
        <span class="lv2-fact-k">${f.k}</span>
        <span class="lv2-fact-v">${f.v}</span>
      </div>`,
  ).join("");
}

export function shellHtml(): string {
  return `
  <div class="lv2">
    <a class="lv2-skip" href="#main">Skip to content</a>
    <header class="lv2-nav">
      <div class="lv2-nav-inner">
        <a class="lv2-brand" href="#top">
          <span data-logo></span>
          <span>streakr</span>
        </a>
        <nav class="lv2-nav-links">
          <a href="#live">Live demo</a>
          <a href="#universal">Contract</a>
          <a href="#records">Records</a>
          <a href="#install">Install</a>
          <a href="#recipes">Recipes</a>
        </nav>
        <a class="lv2-star" href="${REPO_URL}" target="_blank" rel="noreferrer">
          ${GITHUB_MARK}
          <span>Star</span>
          <span class="lv2-star-count" data-real-stars hidden></span>
        </a>
      </div>
    </header>

    <main id="main">
    <section class="lv2-hero" id="top">
      <div class="lv2-hero-glow" aria-hidden="true"></div>
      <div class="lv2-hero-inner">
        <div class="lv2-hero-copy">
          ${eyebrow("Vanilla JS &nbsp;·&nbsp; MIT &nbsp;·&nbsp; no framework")}
          <h1 class="lv2-h1">
            Your activity data.<br />
            <span class="lv2-h1-accent">Beautifully presented.</span>
          </h1>
          <p class="lv2-sub">
            Streakr renders contribution data from anywhere. You own acquisition, caching and
            credentials; Streakr owns the responsive heatmap, ring, filters and statistics.
          </p>
          <div class="lv2-cta">
            <a class="lv2-btn lv2-btn-primary" href="${REPO_URL}" target="_blank" rel="noreferrer">
              ${GITHUB_MARK}
              Star on GitHub
            </a>
            <button class="lv2-btn lv2-btn-ghost" type="button" data-copy="install">
              <code>${INSTALL_CMD}</code>
              <span class="lv2-copy-flag">copy</span>
            </button>
          </div>
        </div>
        <div class="lv2-facts">${heroFactRows()}</div>
      </div>
    </section>

    <section class="lv2-section" id="live">
      <div class="lv2-section-head">
        <div>
          ${eyebrow("01 — Live demo")}
          <h2 class="lv2-h2">Both layouts, side by side</h2>
        </div>
        <p class="lv2-section-sub">
          The same component draws a 53-week heatmap in wide containers and a radial year ring
          under 520px — it switches on container width, not on user agent. Everything here is a
          real instance: toggle a source chip and the grid, the ring and the records recompute.
        </p>
      </div>

      <div class="lv2-stage">
        <div class="lv2-stage-desktop">
          <div class="lv2-stage-label">
            <span>Desktop — heatmap</span>
            <span>container ≥ 520px</span>
          </div>
          <div class="lv2-slot-frame">
            <div class="lv2-slot" id="slot-desktop" data-theme="dark"></div>
          </div>
        </div>

        <div class="lv2-stage-mobile">
          <div class="lv2-stage-label">
            <span>Mobile — ring</span>
            <span>&lt; 520px</span>
          </div>
          <div class="lv2-phone">
            <div class="lv2-phone-screen" data-theme="dark">
              <div class="lv2-phone-status">
                <span>9:41</span>
                <span data-device-badge>ring</span>
              </div>
              <div class="lv2-slot" id="slot-mobile"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="lv2-pg">
        <div class="lv2-panel lv2-controls">
          <div class="lv2-panel-title">Controls</div>
          <div class="lv2-control-groups" id="pg-controls"></div>
        </div>
        <div class="lv2-panel lv2-codepanel">
          <div class="lv2-panel-bar">
            <div class="lv2-panel-title">Your config, as code</div>
            <button class="lv2-copy" type="button" data-copy="live">copy</button>
          </div>
          <pre class="lv2-code"><code id="live-code"></code></pre>
        </div>
      </div>
    </section>

    <section class="lv2-section" id="universal">
      ${eyebrow("02 — Contract")}
      <h2 class="lv2-h2 lv2-h2-block">Any data. One shape.</h2>
      <div class="lv2-sources">${sourceCards()}</div>
      <div class="lv2-pillars">${pillarCards()}</div>
    </section>

    <section class="lv2-section" id="records">
      <div class="lv2-split">
        <div class="lv2-split-copy">
          ${eyebrow("03 — Records")}
          <h2 class="lv2-h2">Four numbers, computed for you</h2>
          <p class="lv2-sub lv2-sub-sm">
            Streaks come out of the validated daily series, so they respect whichever sources
            are switched on. Select the current year and the card swaps Active Rate for Current
            Streak.
          </p>
        </div>
        <div class="lv2-records">${recordRows()}</div>
      </div>
    </section>

    <section class="lv2-section" id="install">
      <div class="lv2-section-head">
        <div>
          ${eyebrow("04 — Install")}
          <h2 class="lv2-h2">Data in. Calendar out.</h2>
        </div>
        <p class="lv2-section-sub">
          Ships ESM plus one stylesheet with no CSS dependencies. Drop it into a bundler, or pull
          it straight off a CDN in a plain HTML file.
        </p>
      </div>
      <div class="lv2-panel">
        <div class="lv2-panel-bar">
          <div class="lv2-tabs" id="install-tabs">
            <button class="lv2-tab active" type="button" data-tab="npm">npm</button>
            <button class="lv2-tab" type="button" data-tab="pnpm">pnpm</button>
            <button class="lv2-tab" type="button" data-tab="yarn">yarn</button>
            <button class="lv2-tab" type="button" data-tab="cdn">CDN</button>
          </div>
          <button class="lv2-copy" type="button" data-copy="install-tab">copy</button>
        </div>
        <pre class="lv2-code"><code id="install-code">${highlight(INSTALL_SNIPPETS.npm ?? "")}</code></pre>
      </div>
    </section>

    <section class="lv2-section" id="recipes">
      ${eyebrow("05 — Recipes")}
      <h2 class="lv2-h2 lv2-h2-block">Bring your data. Or borrow a recipe.</h2>
      <div class="lv2-agents">
        <div class="lv2-agents-copy">
          <p class="lv2-sub lv2-sub-sm">
            Recipes show one way to acquire and adapt data, but they stay in your application.
            Keep them, replace them, or connect your own API—the renderer only cares about its
            small serializable contract.
          </p>
          <div class="lv2-trailer">
            <div class="lv2-trailer-subject">fix(grid): pad trailing week columns</div>
            <div class="lv2-trailer-gap"></div>
            <div class="lv2-trailer-line">Co-authored-by: Claude &lt;noreply@anthropic.com&gt;</div>
            <div class="lv2-trailer-line">Co-authored-by: Codex &lt;codex@openai.com&gt;</div>
            <div class="lv2-trailer-gap"></div>
            <div class="lv2-trailer-out">
              <span class="lv2-trailer-arrow">→</span>
              <span class="lv2-pill">human 1</span>
              <span class="lv2-pill lv2-pill-claude">claude 1</span>
              <span class="lv2-pill lv2-pill-codex">codex 1</span>
            </div>
          </div>
        </div>
        <div class="lv2-panel">
          <div class="lv2-panel-bar">
            <div class="lv2-tabs" id="recipes-tabs">
              <button class="lv2-tab active" type="button" data-tab="github">GitHub JSON</button>
              <button class="lv2-tab" type="button" data-tab="local">Your API</button>
            </div>
            <button class="lv2-copy" type="button" data-copy="recipes-tab">copy</button>
          </div>
          <pre class="lv2-code"><code id="recipes-code">${highlight(RECIPE_SNIPPETS.github ?? "")}</code></pre>
        </div>
      </div>
    </section>

    <section class="lv2-outro">
      <div class="lv2-outro-glow" aria-hidden="true"></div>
      <h2 class="lv2-outro-h">Put your year on the page.</h2>
      <p class="lv2-outro-p">
        Free, MIT and framework-free. Read the docs, or clone the repo and run the demo locally.
      </p>
      <div class="lv2-cta lv2-cta-center">
        <a class="lv2-btn lv2-btn-primary" href="${REPO_URL}#readme" target="_blank" rel="noreferrer">Read the docs</a>
        <a class="lv2-btn lv2-btn-ghost" href="${NPM_URL}" target="_blank" rel="noreferrer">View on npm</a>
      </div>
    </section>
    </main>

    <footer class="lv2-footer">
      <div class="lv2-footer-inner">
        <div class="lv2-brand">
          <span data-logo></span>
          <span>streakr</span>
        </div>
        <div class="lv2-footer-links">
          <a href="${REPO_URL}#readme">Docs</a>
          <a href="${REPO_URL}/tree/main/docs/recipes">Recipes</a>
          <a href="${REPO_URL}">GitHub</a>
          <a href="${NPM_URL}">npm</a>
          <a href="${REPO_URL}/blob/main/CHANGELOG.md">Changelog</a>
          <a href="${REPO_URL}/blob/main/LICENSE">MIT</a>
        </div>
      </div>
      <div class="lv2-footer-bot">
        <span>© 2026 rosado.io</span>
        <span>Open source · MIT</span>
      </div>
    </footer>
  </div>
`;
}
