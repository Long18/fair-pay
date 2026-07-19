import { describe, expect, it } from 'vitest'

import {
  buildGroupOgDescription,
  buildGroupOgTitle,
  buildProfileOgDescription,
  buildProfileOgTitle,
  resolveEntityOgImage,
} from '../entity-og-data'

describe('entity OG builders', () => {
  it('builds profile title and description', () => {
    expect(buildProfileOgTitle({ id: '1', full_name: 'Alex', avatar_url: null })).toBe(
      'Alex on FairPay',
    )
    expect(buildProfileOgDescription({ id: '1', full_name: 'Alex', avatar_url: null })).toContain(
      'Alex',
    )
  })

  it('builds group title and falls back to member count description', () => {
    expect(
      buildGroupOgTitle({
        id: '1',
        name: 'Roomies',
        description: null,
        avatar_url: null,
        member_count: 3,
      }),
    ).toBe('Roomies · FairPay')
    expect(
      buildGroupOgDescription({
        id: '1',
        name: 'Roomies',
        description: null,
        avatar_url: null,
        member_count: 3,
      }),
    ).toContain('3 members')
  })

  it('prefers absolute avatar URLs for og:image', () => {
    expect(resolveEntityOgImage('https://long-pay.vercel.app', 'https://cdn.example/a.png')).toBe(
      'https://cdn.example/a.png',
    )
    expect(resolveEntityOgImage('https://long-pay.vercel.app', null)).toBe(
      'https://long-pay.vercel.app/banner.png',
    )
  })
})
