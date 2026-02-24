"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/form"

interface Country {
  code: string
  name: string
  dialCode: string
  maxLength: number
}

const countries: Country[] = [
  { code: "IN", name: "India", dialCode: "+91", maxLength: 10 },
  { code: "US", name: "United States", dialCode: "+1", maxLength: 10 },
  { code: "UK", name: "United Kingdom", dialCode: "+44", maxLength: 11 },
  { code: "CA", name: "Canada", dialCode: "+1", maxLength: 10 },
  { code: "AU", name: "Australia", dialCode: "+61", maxLength: 9 },
  { code: "DE", name: "Germany", dialCode: "+49", maxLength: 15 },
  { code: "FR", name: "France", dialCode: "+33", maxLength: 9 },
  { code: "JP", name: "Japan", dialCode: "+81", maxLength: 11 },
  { code: "CN", name: "China", dialCode: "+86", maxLength: 11 },
  { code: "SG", name: "Singapore", dialCode: "+65", maxLength: 8 },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", maxLength: 9 },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", maxLength: 9 },
  { code: "PK", name: "Pakistan", dialCode: "+92", maxLength: 10 },
  { code: "BD", name: "Bangladesh", dialCode: "+880", maxLength: 10 },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", maxLength: 9 },
  { code: "NP", name: "Nepal", dialCode: "+977", maxLength: 10 },
  { code: "MY", name: "Malaysia", dialCode: "+60", maxLength: 10 },
  { code: "TH", name: "Thailand", dialCode: "+66", maxLength: 9 },
  { code: "ID", name: "Indonesia", dialCode: "+62", maxLength: 13 },
  { code: "PH", name: "Philippines", dialCode: "+63", maxLength: 10 },
]

interface PhoneInputProps {
  value: {
    countryCode: string
    phoneNumber: string
  }
  onChange: (value: { countryCode: string; phoneNumber: string }) => void
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
}

export function PhoneInput({
  value,
  onChange,
  label = "Phone Number",
  placeholder = "Enter phone number",
  error,
  disabled = false,
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find(c => c.dialCode === value.countryCode) || countries[0]
  )

  const handleCountryChange = (dialCode: string) => {
    const country = countries.find(c => c.dialCode === dialCode)
    if (country) {
      setSelectedCountry(country)
      onChange({
        countryCode: country.dialCode,
        phoneNumber: value.phoneNumber.slice(0, country.maxLength)
      })
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, '')
    const maxLength = selectedCountry.maxLength
    const truncatedInput = input.slice(0, maxLength)
    
    onChange({
      countryCode: selectedCountry.dialCode,
      phoneNumber: truncatedInput
    })
  }

  const handleBlur = () => {
    if (value.phoneNumber && value.phoneNumber.length !== selectedCountry.maxLength) {
      // Error will be handled by parent component validation
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">
        {label}
      </Label>
      <div className="flex gap-2">
        <Select
          value={selectedCountry.dialCode}
          onValueChange={handleCountryChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-32 h-14 rounded-2xl bg-slate-50 border-transparent text-slate-900 focus:bg-white focus:border-primary/20 transition-all font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.code} value={country.dialCode}>
                <div className="flex items-center gap-2">
                  <span>{country.code}</span>
                  <span className="text-sm text-slate-500">{country.dialCode}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="relative flex-1">
          <Input
            type="tel"
            value={value.phoneNumber}
            onChange={handlePhoneChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={`h-14 rounded-2xl bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-primary/20 transition-all font-semibold px-4 ${
              error ? "border-red-500" : ""
            }`}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {value.phoneNumber.length}/{selectedCountry.maxLength}
          </div>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}

export function validatePhoneNumber(phoneNumber: string, countryCode: string): string | null {
  const country = countries.find(c => c.dialCode === countryCode)
  if (!country) {
    return "Invalid country code"
  }
  
  if (!phoneNumber) {
    return "Phone number is required"
  }
  
  if (phoneNumber.length !== country.maxLength) {
    return `Phone number must be exactly ${country.maxLength} digits for ${country.name}`
  }
  
  if (!/^\d+$/.test(phoneNumber)) {
    return "Phone number must contain only digits"
  }
  
  return null
}
