"use client"

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Bell } from 'lucide-react'

export function SocialErrorBanner() {
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const error = searchParams.get('error')
    const email = searchParams.get('email')

    if (error) {
      switch (error) {
        case 'no_youtube_channels_found':
          setMessage(
            `The Google account (${email || 'selected account'}) does not have any YouTube channels associated with it. Please try connecting with a different Google account that has an active YouTube channel.`
          )
          break
        case 'fetch_channel_all_attempts_failed':
          setMessage(
            'Unable to access YouTube channels with the provided credentials. Please try again with a different Google account.'
          )
          break
        case 'no_channel_items_in_api_response':
          setMessage(
            'No YouTube channels found for the selected Google account. Please try connecting with a Google account that has a YouTube channel.'
          )
          break
        default:
          setMessage(`Error connecting social account: ${error.replace(/_/g, ' ')}`)
      }
      setVisible(true)
    }
  }, [searchParams])

  if (!visible) return null

  return (
    <div className="mb-6 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
      <Bell className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium">Unable to connect YouTube channel</p>
        <p className="mt-1 text-sm">{message}</p>
        <p className="mt-2 text-sm font-medium">
          Note: Each Google account can only have one personal YouTube channel. If you want to add multiple channels, they must be Brand Accounts or channels from different Google accounts.
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="rounded-sm px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
      >
        Dismiss
      </button>
    </div>
  )
}