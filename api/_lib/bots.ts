/** Shared crawler / link-preview bot detection for share OG + middleware. */

export const BOT_PATTERNS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Googlebot',
  'bingbot',
  'Applebot',
  'iMessageLinkPreview',
  'Viber',
  'Zalo',
  'Line',
  'KakaoTalk',
  'Skype',
  'redditbot',
  'Embedly',
  'Quora Link Preview',
  'Showyoubot',
  'outbrain',
  'pinterest',
  'vkShare',
  'W3C_Validator',
] as const

/** Canonical UA for FairPay admin OG checker (must match BOT_PATTERNS). */
export const OG_CHECKER_USER_AGENT = 'facebookexternalhit/1.1'

export function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return BOT_PATTERNS.some((bot) => ua.includes(bot.toLowerCase()))
}
