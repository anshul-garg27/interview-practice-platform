"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

// Local imports - extracted for maintainability
import { colors, darkColors, getPhaseColor, getThemeColors, type Phase, type ColorTheme } from './constants/colors'
import { fonts } from './constants/typography'
import { useIsMobile } from './hooks/useIsMobile'
import { useCopyToClipboard } from './hooks/useCopyToClipboard'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useSwipeGestures } from './hooks/useSwipeGestures'
import { useTheme } from './hooks/useTheme'
import { PhaseErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider, useToast } from './components/Toast'
import { SearchBar } from './components/SearchBar'
import { SkeletonModal } from './components/Skeleton'
import type {
  PracticeSolutionModalProps,
  PracticeSolution,
  Approach,
  CodeWalkthroughItem,
  TestCase,
  EdgeCase,
  CommonMistake,
  DryRunStep,
  AlgorithmFlowStep,
  RequirementChecklistItem,
  ComplexityTarget,
  Tradeoff,
  DataStructure,
} from './types/solution'

// Dynamic import for SyntaxHighlighter to reduce initial bundle size (~400KB savings)
const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then(mod => mod.Prism),
  {
    ssr: false,
    loading: () => (
      <div style={{
        padding: 12,
        backgroundColor: '#0D1117',
        borderRadius: 8,
        color: '#8B949E',
        fontFamily: fonts.mono,
        fontSize: 13,
      }}>
        Loading code...
      </div>
    )
  }
)

// Import style separately
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

/* ═══════════════════════════════════════════════════════════════════════════
   ✨ LINEAR MODERN - Practice Solution Modal
   Light theme with multi-color phases - Modern & Professional
   Refactored for performance, accessibility, and maintainability
   ═══════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function cleanCodeBlock(text: string | undefined | null | unknown): string {
  if (!text) return ''
  // Handle non-string inputs gracefully
  if (typeof text !== 'string') {
    // If it's an array or object, convert to JSON string for display
    if (Array.isArray(text) || typeof text === 'object') {
      return JSON.stringify(text, null, 2)
    }
    return String(text)
  }
  let result = text
  result = result.replace(/\\\\n/g, '\n')
  result = result.replace(/\\n/g, '\n')
  result = result.replace(/\\\\t/g, '    ')
  result = result.replace(/\\t/g, '    ')
  result = result.replace(/\\"/g, '"')
  result = result.replace(/\\'/g, "'")
  result = result.replace(/\\\\/g, '\\')
  result = result.replace(/^```[\w]*\n?/, '')
  result = result.replace(/\n?```$/, '')
  return result.trim()
}

function normalizeText(text: string): string {
  let result = text
  result = result.replace(/\\\\n/g, '\n')
  result = result.replace(/\\\\t/g, '    ')
  result = result.replace(/\\n/g, '\n')
  result = result.replace(/\\t/g, '    ')
  result = result.replace(/\\"/g, '"')
  result = result.replace(/\\'/g, "'")
  return result
}

// Fix broken string literals where \n in print statements became actual newlines
function fixBrokenStringLiterals(lines: string[]): string[] {
  const result: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i]
    // Check if line ends with unclosed string: print(" or ends with " + "
    const endsWithUnclosedString = /\(\s*["']$/.test(currentLine.trimEnd()) ||
                                   /["']\s*\+\s*["']$/.test(currentLine.trimEnd())
    const nextLine = lines[i + 1]
    const nextStartsWithStringContinuation = nextLine && /^\s*["']/.test(nextLine)

    if (endsWithUnclosedString && nextStartsWithStringContinuation) {
      // Merge with next line, adding \n to represent the escaped newline
      result.push(currentLine + '\\n' + nextLine.trim())
      i++ // Skip next line as we merged it
    } else {
      result.push(currentLine)
    }
  }
  return result
}

function getCodeString(linesArray: string[] | undefined, stringFormat: string | undefined): string {
  if (linesArray && Array.isArray(linesArray) && linesArray.length > 0) {
    // Fix any broken string literals before joining
    const fixedLines = fixBrokenStringLiterals(linesArray)
    return fixedLines.join('\n')
  }
  if (stringFormat) {
    return cleanCodeBlock(stringFormat)
  }
  return ''
}

function hasCode(linesArray: string[] | undefined, stringFormat: string | undefined): boolean {
  return (linesArray && Array.isArray(linesArray) && linesArray.length > 0) || 
         (!!stringFormat && stringFormat.length > 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Enhanced Markdown text renderer with tables, code blocks, headers support
function MarkdownText({ text, className = '' }: { text: string | undefined | null, className?: string }) {
  if (!text) return null
  const normalized = normalizeText(text)

  // Parse inline markdown: **bold**, `code`, *italic*
  const parseInline = (str: string, keyPrefix: string = ''): React.ReactNode[] => {
    const result: React.ReactNode[] = []
    // Pattern for: **bold**, `code`, *italic* (but not **)
    const inlinePattern = /(\*\*(.+?)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)/g
    let lastIndex = 0
    let match
    let keyIdx = 0

    while ((match = inlinePattern.exec(str)) !== null) {
      if (match.index > lastIndex) {
        result.push(<span key={`${keyPrefix}-${keyIdx++}`}>{str.slice(lastIndex, match.index)}</span>)
      }
      if (match[1]) {
        // Bold **text**
        result.push(
          <strong key={`${keyPrefix}-${keyIdx++}`} style={{ fontWeight: 700, color: colors.textBright }}>
            {match[2]}
          </strong>
        )
      } else if (match[3]) {
        // Inline code `code`
        result.push(
          <code
            key={`${keyPrefix}-${keyIdx++}`}
            style={{
              padding: '2px 6px',
              backgroundColor: colors.inlineCodeBg,
              color: colors.inlineCodeText,
              borderRadius: 4,
              fontSize: '0.875em',
              fontFamily: fonts.mono,
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}
          >
            {match[4]}
          </code>
        )
      } else if (match[5]) {
        // Italic *text*
        result.push(
          <em key={`${keyPrefix}-${keyIdx++}`} style={{ fontStyle: 'italic', color: colors.textSecondary }}>
            {match[6]}
          </em>
        )
      }
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < str.length) {
      result.push(<span key={`${keyPrefix}-${keyIdx++}`}>{str.slice(lastIndex)}</span>)
    }
    return result.length > 0 ? result : [<span key={`${keyPrefix}-0`}>{str}</span>]
  }

  const lines = normalized.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    
    // Empty line
        if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 8 }} />)
      i++
      continue
    }

    // Code block ```
    if (line.trim().startsWith('```')) {
      const rawCodeLines: string[] = []
      const langMatch = line.trim().match(/^```(\w*)/)
      const lang = langMatch ? langMatch[1] : 'text'
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        rawCodeLines.push(lines[i])
        i++
      }
      i++ // Skip closing ```

      // Fix broken string literals (when \n in print statements becomes actual newline)
      const codeLines = fixBrokenStringLiterals(rawCodeLines)

      elements.push(
        <pre key={`code-${i}`} style={{
          margin: '8px 0',
          padding: 12,
          backgroundColor: colors.codeBg,
          borderRadius: 10,
          overflow: 'auto',
          fontSize: 13,
          lineHeight: 1.5,
          fontFamily: fonts.mono,
          color: colors.codeText,
          border: `1px solid ${colors.codeBorder}`,
          minWidth: 0
        }}>
          <code style={{ whiteSpace: 'pre', display: 'block' }}>{codeLines.join('\n')}</code>
        </pre>
      )
      continue
    }

    // Table detection (line starts with |)
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      
      // Parse table - filter out separator rows (contain only -, :, |, spaces)
      const isSeparatorRow = (row: string) => {
        const content = row.replace(/\|/g, '').trim()
        return /^[-:\s]+$/.test(content)
      }
      
      const rows = tableLines.filter(l => !isSeparatorRow(l))
      const headerRow = rows[0]
      const dataRows = rows.slice(1)
      
      const parseTableRow = (row: string) => {
        return row.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim())
      }
      
      const headers = parseTableRow(headerRow)
      
      elements.push(
        <div key={`table-${i}`} style={{ margin: '12px 0', overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: 13,
            backgroundColor: colors.bgCarbon,
            borderRadius: 8,
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ backgroundColor: colors.bgGraphite }}>
                {headers.map((h, hi) => (
                  <th key={hi} style={{ 
                    padding: '10px 12px', 
                    textAlign: 'left', 
                    fontWeight: 600,
                    color: colors.textBright,
                    borderBottom: `1px solid ${colors.borderSubtle}`
                  }}>
                    {parseInline(h, `th-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => {
                const cells = parseTableRow(row)
          return (
                  <tr key={ri} style={{ 
                    backgroundColor: ri % 2 === 0 ? colors.bgCarbon : colors.bgGraphite 
                  }}>
                    {cells.map((cell, ci) => (
                      <td key={ci} style={{ 
                        padding: '10px 12px', 
                        color: colors.textSecondary,
                        borderBottom: `1px solid ${colors.borderSubtle}`
                      }}>
                        {parseInline(cell, `td-${ri}-${ci}`)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Header # ## ###
    const headerMatch = line.match(/^(#{1,6})\s+(.*)/)
    if (headerMatch) {
      const level = headerMatch[1].length
      const headerText = headerMatch[2]
      const sizes: Record<number, number> = { 1: 20, 2: 18, 3: 16, 4: 15, 5: 14, 6: 13 }
      elements.push(
        <div key={i} style={{ 
          fontSize: sizes[level] || 14, 
          fontWeight: 700, 
          color: colors.textBright,
          marginTop: level <= 2 ? 16 : 12,
          marginBottom: 8
        }}>
          {parseInline(headerText, `h-${i}`)}
        </div>
      )
      i++
      continue
    }

    // Bullet point
        const bulletMatch = line.match(/^(\s*)([-•*])\s+(.*)/)
        if (bulletMatch) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingLeft: bulletMatch[1].length * 8 }}>
          <span style={{ color: colors.phaseUnderstand, flexShrink: 0 }}>•</span>
          <span>{parseInline(bulletMatch[3], `${i}`)}</span>
            </div>
          )
      i++
      continue
        }

    // Numbered list
        const numMatch = line.match(/^(\s*)(\d+)[.)]\s+(.*)/)
        if (numMatch) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingLeft: numMatch[1].length * 8 }}>
          <span style={{ color: colors.phaseApproach, flexShrink: 0, fontWeight: 500, minWidth: 20 }}>{numMatch[2]}.</span>
          <span>{parseInline(numMatch[3], `${i}`)}</span>
            </div>
          )
      i++
      continue
    }

    // Horizontal rule ---
    if (line.match(/^[-]{3,}$/) || line.match(/^[*]{3,}$/)) {
      elements.push(
        <hr key={i} style={{ border: 'none', borderTop: `1px solid ${colors.borderSubtle}`, margin: '12px 0' }} />
      )
      i++
      continue
    }

    // Regular paragraph
    elements.push(<div key={i}>{parseInline(line, `${i}`)}</div>)
    i++
        }

        return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 4, color: colors.textSecondary, fontSize: 14, lineHeight: 1.7 }}>
      {elements}
          </div>
        )
}

// Phase Tab with phase-specific colors
function PhaseTab({
  icon,
  label,
  isActive,
  onClick,
  hasContent,
  phase,
  isMobile,
  tabIndex,
  onKeyDown,
}: {
  icon: string
  label: string
  isActive: boolean
  onClick: () => void
  hasContent: boolean
  phase: Phase
  isMobile: boolean
  tabIndex?: number
  onKeyDown?: (e: React.KeyboardEvent) => void
}) {
  // Use the utility function instead of inline switch
  const phaseColorSet = getPhaseColor(phase)

  return (
    <button
      onClick={onClick}
      disabled={!hasContent}
      role="tab"
      aria-selected={isActive}
      aria-disabled={!hasContent}
      tabIndex={tabIndex ?? (isActive ? 0 : -1)}
      onKeyDown={onKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? 3 : 4,
        padding: isMobile ? '6px 10px' : '10px 16px',
        minWidth: isMobile ? 55 : 85,
        height: isMobile ? 46 : 58,
        backgroundColor: isActive ? phaseColorSet.bg : colors.bgCarbon,
        border: `2px solid ${isActive ? phaseColorSet.color : colors.borderSubtle}`,
        borderRadius: isMobile ? 8 : 12,
        cursor: hasContent ? 'pointer' : 'not-allowed',
        opacity: hasContent ? 1 : 0.4,
        transition: 'all 0.2s ease',
        position: 'relative',
        flexShrink: 0,
        boxShadow: isActive ? `0 4px 12px ${phaseColorSet.color}30` : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <span style={{ fontSize: isMobile ? 14 : 18, lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontSize: isMobile ? 8 : 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: isActive ? phaseColorSet.color : colors.textSecondary,
        whiteSpace: 'nowrap',
        display: 'block',
      }}>
        {isMobile ? label.slice(0, 4) : label}
      </span>
      {isActive && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: phaseColorSet.color,
          borderRadius: '3px 3px 0 0',
        }} />
      )}
    </button>
  )
}

// Collapsible Section - Light theme, Mobile Responsive
function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  accentColor = colors.phaseUnderstand,
  isMobile = false,
}: {
  title: string
  icon?: string
  children: React.ReactNode
  defaultOpen?: boolean
  accentColor?: string
  isMobile?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div style={{
      borderRadius: isMobile ? 6 : 8,
      overflow: 'hidden',
      backgroundColor: colors.bgCarbon,
      border: `1px solid ${colors.borderSubtle}`,
      borderLeft: `3px solid ${accentColor}`,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: isMobile ? '8px 10px' : '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bgGraphite}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flex: 1, minWidth: 0 }}>
          {icon && <span style={{ fontSize: isMobile ? 12 : 15, flexShrink: 0 }}>{icon}</span>}
          <h3 style={{ 
            fontSize: isMobile ? 11 : 13, 
            fontWeight: 700, 
            color: colors.textBright, 
            textTransform: 'uppercase', 
            letterSpacing: '0.03em',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {title}
          </h3>
          </div>
        <svg
          style={{ 
            width: isMobile ? 14 : 16, 
            height: isMobile ? 14 : 16, 
            color: colors.textMuted,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s ease',
            flexShrink: 0
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
        {isOpen && (
        <div style={{ 
          padding: isMobile ? '0 10px 10px 10px' : '0 14px 12px 14px',
          borderTop: `1px solid ${colors.borderSubtle}`,
          paddingTop: isMobile ? 8 : 10
        }}>
              {children}
            </div>
      )}
    </div>
  )
}

// Interview Tip Callout - Mobile Responsive
function InterviewTip({ title, children, isMobile = false }: { title?: string; children: React.ReactNode; isMobile?: boolean }) {
  return (
    <div style={{
      margin: isMobile ? '6px 0' : '8px 0',
      padding: isMobile ? '8px 10px' : '10px 14px',
      background: `linear-gradient(135deg, ${colors.tipGradientStart} 0%, ${colors.tipGradientEnd} 100%)`,
      border: `1px solid ${colors.tipBorder}`,
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(251, 191, 36, 0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 24 }}>💡</span>
        <div>
          {title && (
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.tipText,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 6
            }}>
              {title}
            </div>
          )}
          <div style={{ fontSize: 14, color: colors.textPrimary, fontStyle: 'italic', lineHeight: 1.6 }}>{children}</div>
        </div>
      </div>
    </div>
  )
}

// Code Block - Uses safe clipboard hook with fallback
function CodeBlock({ code, language = 'python', title }: { code: string; language?: string; title?: string }) {
  const { copied, copyToClipboard } = useCopyToClipboard(2000)
  const cleanedCode = cleanCodeBlock(code)

  const handleCopy = () => copyToClipboard(cleanedCode)

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${colors.codeBorder}` }}>
      {title && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: colors.codeHeaderBg,
          borderBottom: `1px solid ${colors.codeBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: colors.codeTextMuted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{title}</span>
          <button
            onClick={handleCopy}
            aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              backgroundColor: colors.codeButtonBg,
              border: `1px solid ${colors.codeButtonBorder}`,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: copied ? colors.codeSuccess : colors.codeTextMuted
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      )}
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '16px',
          fontSize: '13px',
          background: colors.codeBg,
          borderRadius: title ? '0' : '8px'
        }}
        showLineNumbers
        lineNumberStyle={{ color: colors.codeLineNumbers, paddingRight: '16px' }}
      >
        {cleanedCode}
      </SyntaxHighlighter>
    </div>
  )
}

// Styled Code Example - Renders code with syntax highlighting for function calls
// Highlights: function names, $amounts, numbers, strings
function StyledCodeExample({ code, themeColors }: { code: string; themeColors: ColorTheme }) {
  const c = themeColors

  if (!code) return null

  const parts: React.ReactNode[] = []
  let key = 0

  // Pattern matches: functionName( | $amount | numbers | strings | commas/parens
  // Groups: 1=functionName, 2=$amount, 3=number, 4=quoted string
  const pattern = /(\w+)\(|(\$\d+(?:\.\d+)?)|(\d+)|('[^']*'|"[^"]*")|([(),\s])/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(code)) !== null) {
    // Add any text before this match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>)
    }

    if (match[1] !== undefined) {
      // Function name - yellow/amber color
      parts.push(
        <span key={key++} style={{ color: c.phaseApproach, fontWeight: 600 }}>
          {match[1]}
        </span>
      )
      parts.push(<span key={key++} style={{ color: c.textMuted }}>(</span>)
    } else if (match[2] !== undefined) {
      // Dollar amount $20 - green success color
      parts.push(
        <span key={key++} style={{ color: c.success, fontWeight: 600 }}>
          {match[2]}
        </span>
      )
    } else if (match[3] !== undefined) {
      // Number - cyan/teal color
      parts.push(
        <span key={key++} style={{ color: c.phaseVerify, fontWeight: 500 }}>
          {match[3]}
        </span>
      )
    } else if (match[4] !== undefined) {
      // String - pink/magenta color
      parts.push(
        <span key={key++} style={{ color: '#E879F9' }}>
          {match[4]}
        </span>
      )
    } else if (match[5] !== undefined) {
      // Punctuation - muted color
      parts.push(
        <span key={key++} style={{ color: c.textMuted }}>
          {match[5]}
        </span>
      )
    }
    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>)
  }

  return <>{parts}</>
}

// Dry Run Table - Renders markdown tables with proper styling
// Theme-aware: accepts colors prop for dark mode support
function DryRunTable({ tableText, themeColors }: { tableText: string; themeColors: ColorTheme }) {
  const c = themeColors // shorthand for cleaner code

  if (!tableText) return null

  const normalized = tableText.replace(/\\n/g, '\n')
  const lines = normalized.split('\n').filter(line => line.trim())

  const rows: string[][] = []
  let headers: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Skip separator rows (|---|---|)
    if (line.match(/^\|[\s\-:|\s]+\|$/)) continue

    if (line.includes('|')) {
      const cells = line.split('|')
        .map(cell => cell.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)

      if (cells.length > 0) {
        if (headers.length === 0) {
          headers = cells
        } else {
          rows.push(cells)
        }
      }
    }
  }

  if (headers.length === 0) return null

  // Parse inline markdown in cells - handles **bold**, `code`, {HashMap}, Decimal(), $amounts
  const renderCell = (cell: string): React.ReactNode => {
    if (!cell || cell === '-') return <span style={{ color: c.textMuted }}>—</span>

    const parts: React.ReactNode[] = []
    let key = 0

    // Combined pattern - order matters! Bold must come before other patterns
    // Groups: 1-2: **bold**, 3-4: `code`, 5: {HashMap}, 6: Decimal('x'), 7: $amount
    const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|(\{[^}]+\})|Decimal\('([^']+)'\)|(\$[\d,.]+)/g
    let lastIndex = 0
    let match

    while ((match = pattern.exec(cell)) !== null) {
      // Add plain text before this match
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{cell.slice(lastIndex, match.index)}</span>)
      }

      if (match[1] !== undefined) {
        // Bold **text** - highlight with bright color and bold weight
        parts.push(
          <strong key={key++} style={{
            fontWeight: 700,
            color: c.success,
            backgroundColor: `${c.success}15`,
            padding: '1px 4px',
            borderRadius: 3,
          }}>
            {match[1]}
          </strong>
        )
      } else if (match[2] !== undefined) {
        // Inline code `code` - teal/cyan badge
        parts.push(
          <code key={key++} style={{
            padding: '2px 6px',
            backgroundColor: c.phaseVerifyBg,
            color: c.phaseVerify,
            borderRadius: 4,
            fontSize: '0.85em',
            fontWeight: 500,
          }}>
            {match[2]}
          </code>
        )
      } else if (match[3] !== undefined) {
        // HashMap object {key: value} - blue badge
        parts.push(
          <code key={key++} style={{
            padding: '2px 6px',
            backgroundColor: c.phaseSolutionBg,
            color: c.phaseSolution,
            borderRadius: 4,
            fontSize: '0.85em',
          }}>
            {match[3]}
          </code>
        )
      } else if (match[4] !== undefined) {
        // Decimal('value') - amber badge, show just the value
        parts.push(
          <code key={key++} style={{
            padding: '2px 6px',
            backgroundColor: c.phaseApproachBg,
            color: c.phaseApproach,
            borderRadius: 4,
            fontSize: '0.85em',
          }}>
            {`Decimal('${match[4]}')`}
          </code>
        )
      } else if (match[5] !== undefined) {
        // Dollar amounts $50 or $1,234.56 - green success
        parts.push(
          <strong key={key++} style={{ color: c.success, fontWeight: 600 }}>
            {match[5]}
          </strong>
        )
      }
      lastIndex = match.index + match[0].length
    }

    // Add remaining text after last match
    if (lastIndex < cell.length) {
      parts.push(<span key={key++}>{cell.slice(lastIndex)}</span>)
    }

    return parts.length > 0 ? parts : <span>{cell}</span>
  }

  return (
    <div style={{
      overflowX: 'auto',
      borderRadius: 10,
      border: `1px solid ${c.borderMedium}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
        <thead>
          <tr style={{
            background: `linear-gradient(135deg, ${c.phaseVerify}18 0%, ${c.phaseApproach}12 100%)`,
          }}>
            {headers.map((header, i) => (
              <th key={i} style={{
                padding: '12px 14px',
                textAlign: 'left',
                fontSize: 11,
                fontWeight: 700,
                color: c.textBright,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                borderBottom: `2px solid ${c.phaseVerify}40`,
                whiteSpace: 'nowrap',
              }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              style={{
                backgroundColor: rowIdx % 2 === 0 ? c.bgCarbon : c.bgGraphite,
                transition: 'background-color 0.15s ease',
              }}
            >
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  color: c.textPrimary,
                  fontFamily: fonts.mono,
                  borderBottom: `1px solid ${c.borderSubtle}`,
                  lineHeight: 1.5,
                  verticalAlign: 'top',
                }}>
                  {renderCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Difficulty Badge
function DifficultyBadge({ difficulty, variant = 'header' }: { difficulty?: string; variant?: 'header' | 'content' }) {
  if (!difficulty) return null
  const d = difficulty.toLowerCase()
  
  // For header (on gradient), use white/translucent
  if (variant === 'header') {
  return (
      <span style={{
        padding: '4px 12px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: '#FFFFFF',
        backdropFilter: 'blur(4px)',
        letterSpacing: '0.05em'
      }}>
        {difficulty}
      </span>
    )
  }
  
  // For content areas, use semantic colors
  const badgeStyles: Record<string, { bg: string; color: string; border: string }> = {
    easy: { bg: colors.successMuted, color: colors.success, border: 'rgba(16, 185, 129, 0.3)' },
    medium: { bg: colors.warningMuted, color: colors.warningText, border: 'rgba(245, 158, 11, 0.3)' },
    hard: { bg: colors.errorMuted, color: colors.error, border: 'rgba(239, 68, 68, 0.3)' },
  }
  
  const style = badgeStyles[d] || badgeStyles.medium
  
  return (
    <span style={{
      padding: '4px 12px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'uppercase',
      backgroundColor: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`
    }}>
      {difficulty}
    </span>
  )
}

// ASCII Block
function ASCIIBlock({ content, title }: { content: string; title?: string }) {
  const cleaned = cleanCodeBlock(content)
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${colors.codeBorder}`, backgroundColor: colors.codeBg }}>
      {title && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: colors.codeHeaderBg,
          borderBottom: `1px solid ${colors.codeBorder}`
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: colors.codeTextMuted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{title}</span>
        </div>
      )}
      <pre style={{
        margin: 0,
        padding: 12,
        fontSize: 12,
        fontFamily: fonts.mono,
        color: colors.codeText,
        overflowX: 'auto',
        whiteSpace: 'pre',
        lineHeight: 1.5
      }}>
        {cleaned}
      </pre>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE CONTENT
// ─────────────────────────────────────────────────────────────────────────────

function PhaseUnderstand({ solution }: { solution: PracticeSolution }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {solution.communication_script?.opening_verbatim && (
        <InterviewTip title="What to say first">
          <p style={{ fontStyle: 'italic', margin: 0 }}>"{solution.communication_script.opening_verbatim}"</p>
        </InterviewTip>
      )}

                {(solution.problem_analysis?.first_impressions || solution.problem_understanding?.what_changes) && (
        <Section title="First Impressions" icon="🎯" accentColor={colors.phaseUnderstand}>
                    <MarkdownText
                      text={solution.problem_analysis?.first_impressions || solution.problem_understanding?.what_changes}
            className="" 
                    />
        </Section>
                )}

      {/* Follow-up: New Requirements */}
      {solution.problem_understanding?.new_requirements && solution.problem_understanding.new_requirements.length > 0 && (
        <Section title="New Requirements" icon="📋" accentColor={colors.phaseSolution}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {solution.problem_understanding.new_requirements.map((req: string, i: number) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: colors.textSecondary }}>
                <span style={{ color: colors.phaseSolution }}>✓</span>
                <MarkdownText text={req} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Follow-up: Key Insight */}
      {solution.problem_understanding?.key_insight && (
        <Section title="Key Insight" icon="💡" accentColor={colors.emberWarm}>
          <div style={{
            padding: 12,
            backgroundColor: colors.emberFaint,
            borderRadius: 8,
            border: `1px solid ${colors.borderEmber}`
          }}>
            <MarkdownText text={solution.problem_understanding.key_insight} />
                  </div>
        </Section>
                )}

                {(solution.problem_analysis?.pattern_recognition || solution.pattern_recognition?.pattern) && (
        <Section title="Pattern Recognition" icon="🧩" accentColor={colors.info}>
          {/* Main format: problem_analysis.pattern_recognition is a string */}
                {solution.problem_analysis?.pattern_recognition && (
            <MarkdownText text={solution.problem_analysis.pattern_recognition} />
          )}
          {/* Follow-up format: pattern_recognition.pattern */}
          {solution.pattern_recognition?.pattern && !solution.problem_analysis?.pattern_recognition && (
            <MarkdownText text={solution.pattern_recognition.pattern} />
          )}
          {/* Indicators */}
          {solution.pattern_recognition?.indicators && solution.pattern_recognition.indicators.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.borderSubtle}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Pattern Indicators
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {solution.pattern_recognition.indicators.map((ind: string, i: number) => (
                  <li key={i} style={{ fontSize: 13, color: colors.textSecondary, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: colors.info }}>•</span>
                    <MarkdownText text={ind} />
                  </li>
                ))}
              </ul>
                  </div>
          )}
          {/* Similar Problems */}
          {solution.pattern_recognition?.similar_problems && solution.pattern_recognition.similar_problems.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.borderSubtle}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Similar Problems
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {solution.pattern_recognition.similar_problems.map((p: string, i: number) => (
                  <div key={i} style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    backgroundColor: colors.bgGraphite,
                    borderRadius: 6,
                    borderLeft: `3px solid ${colors.info}`
                  }}>
                    <MarkdownText text={p} />
                  </div>
                ))}
              </div>
                  </div>
          )}
        </Section>
                )}

                {(solution.problem_analysis?.key_constraints || solution.problem_understanding?.new_constraints) && (
        <Section title="Key Constraints" icon="⚠️" accentColor={colors.warning}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(solution.problem_analysis?.key_constraints || solution.problem_understanding?.new_constraints || []).map((c: string, i: number) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: colors.textSecondary }}>
                <span style={{ color: colors.warning }}>▸</span>
                          <MarkdownText text={c} />
                        </li>
                      ))}
                    </ul>
        </Section>
                )}

                {solution.problem_analysis?.clarifying_questions && Array.isArray(solution.problem_analysis.clarifying_questions) && (
        <Section title="Clarifying Questions to Ask" icon="❓" defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {solution.problem_analysis.clarifying_questions.map((q: string, i: number) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: 12,
                backgroundColor: colors.bgGraphite,
                borderRadius: 8
              }}>
                <span style={{ color: colors.info, fontWeight: 700, fontSize: 13 }}>Q{i + 1}</span>
                <MarkdownText text={q} className="" />
                        </div>
                      ))}
                    </div>
        </Section>
      )}

      {solution.problem_analysis?.edge_cases_to_consider && (
        <Section title="Edge Cases" icon="🔍" accentColor={colors.error} defaultOpen={false}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {solution.problem_analysis.edge_cases_to_consider.map((edge: string, i: number) => (
              <div key={i} style={{
                padding: '8px 12px',
                backgroundColor: colors.errorMuted,
                color: colors.textSecondary,
                fontSize: 13,
                borderRadius: 8,
                border: `1px solid rgba(239, 68, 68, 0.2)`
              }}>
                <MarkdownText text={edge} />
                        </div>
                      ))}
                    </div>
              </Section>
            )}
    </div>
  )
}

function PhaseApproach({ solution }: { solution: PracticeSolution }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {solution.communication_script?.after_clarification && (
        <InterviewTip title="After clarifying, say">
          <p style={{ fontStyle: 'italic', margin: 0 }}>"{solution.communication_script.after_clarification}"</p>
        </InterviewTip>
      )}

            {solution.thinking_process && (
        <Section title="Thinking Process" icon="🧠" accentColor={colors.phaseApproach}>
          {/* Handle array format: [{ step, thought, why }, ...] */}
          {Array.isArray(solution.thinking_process) && solution.thinking_process.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {solution.thinking_process.map((item: any, i: number) => (
                <div key={i} style={{
                  padding: 12,
                  backgroundColor: colors.bgGraphite,
                  borderRadius: 8,
                  borderLeft: `3px solid ${colors.phaseApproach}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: colors.phaseApproachBg,
                      color: colors.phaseApproach,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {item.step || i + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: colors.textBright, fontWeight: 500, marginBottom: 4 }}>
                        {item.thought}
                      </div>
                      {item.why && (
                        <div style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>
                          → {item.why}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Handle object format: { step_by_step: string[], key_insight, why_this_works } */}
          {!Array.isArray(solution.thinking_process) && solution.thinking_process.step_by_step && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {solution.thinking_process.step_by_step.map((step: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: colors.phaseApproachBg,
                    color: colors.phaseApproach,
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {i + 1}
                  </span>
                  <MarkdownText text={step} className="" />
                </div>
              ))}
            </div>
          )}
          {!Array.isArray(solution.thinking_process) && solution.thinking_process.key_insight && (
            <div style={{
              padding: 12,
              backgroundColor: colors.emberFaint,
              borderRadius: 8,
              border: `1px solid ${colors.borderEmber}`
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.emberGlow, textTransform: 'uppercase', marginBottom: 4 }}>
                Key Insight
              </div>
              <MarkdownText text={solution.thinking_process.key_insight} />
            </div>
          )}
          {!Array.isArray(solution.thinking_process) && solution.thinking_process.why_this_works && (
            <div style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: colors.successMuted,
              borderRadius: 8,
              borderLeft: `3px solid ${colors.success}`
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 4 }}>
                Why This Works
              </div>
              <MarkdownText text={solution.thinking_process.why_this_works} />
            </div>
          )}
        </Section>
      )}

      {solution.requirements_coverage?.checklist && (
        <Section title="Requirements Checklist" icon="✅" accentColor={colors.success}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {solution.requirements_coverage.checklist.map((item: any, i: number) => (
              <div key={i} style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: colors.success }}>☑</span>
                  <MarkdownText text={item.requirement} className="" />
                  </div>
                <div style={{ marginLeft: 24, fontSize: 13, color: colors.textMuted }}>
                  <MarkdownText text={item.how_met} />
                  </div>
                {item.gotchas && item.gotchas.length > 0 && (
                  <div style={{ marginLeft: 24, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {item.gotchas.map((g: string, gi: number) => (
                      <div key={gi} style={{
                        padding: '6px 10px',
                        fontSize: 12,
                        backgroundColor: colors.warningMuted,
                        borderRadius: 6,
                        borderLeft: `3px solid ${colors.warning}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6
                      }}>
                        <span style={{ color: colors.warning }}>⚠</span>
                        <MarkdownText text={g} />
                      </div>
                    ))}
                  </div>
                )}
                  </div>
                        ))}
                      </div>
              </Section>
            )}

      {/* Complexity Targets - Follow-up format */}
      {solution.requirements_coverage?.complexity_targets && solution.requirements_coverage.complexity_targets.length > 0 && (
        <Section title="Complexity Targets" icon="📊" accentColor={colors.info} defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {solution.requirements_coverage.complexity_targets.map((ct: any, i: number) => (
              <div key={i} style={{ 
                padding: 12, 
                backgroundColor: colors.bgGraphite, 
                borderRadius: 8,
                borderLeft: ct.achieved === ct.target ? `3px solid ${colors.success}` : `3px solid ${colors.warning}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: colors.textBright }}>{ct.operation}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: 4, 
                      fontSize: 11, 
                      backgroundColor: colors.bgCarbon,
                      color: colors.textMuted
                    }}>
                      Target: {ct.target}
                              </span>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: 4, 
                      fontSize: 11, 
                      backgroundColor: ct.achieved === ct.target ? colors.successMuted : colors.warningMuted,
                      color: ct.achieved === ct.target ? colors.success : colors.warning
                    }}>
                      {ct.achieved}
                    </span>
                            </div>
                              </div>
                {ct.why && (
                  <div style={{ fontSize: 13, color: colors.textMuted }}>
                    <MarkdownText text={ct.why} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
        </Section>
      )}

      {/* Non-Goals - Follow-up format */}
      {solution.requirements_coverage?.non_goals && solution.requirements_coverage.non_goals.length > 0 && (
        <Section title="Non-Goals (Out of Scope)" icon="🚫" accentColor={colors.error} defaultOpen={false}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {solution.requirements_coverage.non_goals.map((ng: string, i: number) => (
              <li key={i} style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: 8, 
                padding: '8px 12px',
                backgroundColor: colors.errorMuted,
                borderRadius: 6,
                fontSize: 13,
                color: colors.textSecondary
              }}>
                <span style={{ color: colors.error }}>✗</span>
                <MarkdownText text={ng} />
              </li>
            ))}
          </ul>
              </Section>
            )}

      {solution.tradeoffs && solution.tradeoffs.length > 0 && (
        <Section title="Design Tradeoffs" icon="⚖️" accentColor={colors.info} defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {solution.tradeoffs.map((t: any, i: number) => (
              <div key={i} style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: colors.textBright, marginBottom: 12 }}>
                  <MarkdownText text={t.decision} />
                            </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                  <div style={{ padding: 10, backgroundColor: colors.successMuted, borderRadius: 6, borderLeft: `3px solid ${colors.success}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 6 }}>Chosen</div>
                    <div style={{ color: colors.textSecondary }}>
                      <MarkdownText text={t.chosen} />
                              </div>
                  </div>
                  {t.alternative && (
                    <div style={{ padding: 10, backgroundColor: colors.bgCarbon, border: `1px solid ${colors.borderSubtle}`, borderRadius: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Alternative</div>
                      <div style={{ color: colors.textMuted }}>
                        <MarkdownText text={t.alternative} />
                      </div>
                  </div>
                )}
                        </div>
                <div style={{ marginTop: 10, fontSize: 13, color: colors.textMuted }}>
                  <strong style={{ color: colors.textSecondary }}>Why: </strong>
                  <MarkdownText text={t.why} />
                      </div>
                {t.when_to_switch && (
                  <div style={{ marginTop: 8, fontSize: 12, color: colors.info, fontStyle: 'italic' }}>
                    💡 When to switch: <MarkdownText text={t.when_to_switch} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
              </Section>
            )}

      {/* Optimal Solution Details */}
      {solution.optimal_solution && (
        <Section title="Optimal Solution" icon="🎯" accentColor={colors.phaseSolution} defaultOpen={true}>
          {solution.optimal_solution.name && (
            <div style={{ 
              fontSize: 16, 
              fontWeight: 600, 
              color: colors.phaseSolution, 
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>✓</span> {solution.optimal_solution.name}
            </div>
          )}
          {solution.optimal_solution.explanation_md && (
            <div style={{ marginBottom: 16 }}>
              <MarkdownText text={solution.optimal_solution.explanation_md} />
                        </div>
          )}
          {solution.optimal_solution.data_structures && solution.optimal_solution.data_structures.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Data Structures
                      </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {solution.optimal_solution.data_structures.map((ds: any, i: number) => (
                  <div key={i} style={{ 
                    padding: '8px 12px', 
                    backgroundColor: colors.infoMuted, 
                    borderRadius: 8,
                    borderLeft: `3px solid ${colors.info}`
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: colors.textBright }}>{ds.structure}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{ds.purpose}</div>
                      </div>
                ))}
              </div>
            </div>
          )}
          {solution.optimal_solution.algorithm_steps && solution.optimal_solution.algorithm_steps.length > 0 && (
                            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Algorithm Steps
              </div>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {solution.optimal_solution.algorithm_steps.map((step: string, i: number) => (
                  <li key={i} style={{ fontSize: 13, color: colors.textSecondary }}>
                    <MarkdownText text={step} />
                                  </li>
                                ))}
              </ol>
                            </div>
                          )}
          {solution.optimal_solution.why_decimal && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              backgroundColor: colors.warningMuted, 
              borderRadius: 8,
              borderLeft: `3px solid ${colors.warning}`
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.warning, textTransform: 'uppercase', marginBottom: 8 }}>
                ⚠️ Why Decimal/BigDecimal?
              </div>
              <MarkdownText text={solution.optimal_solution.why_decimal} />
            </div>
          )}
              </Section>
            )}

      {/* Extensibility Notes - Follow-up format */}
      {solution.extensibility_notes && (
        <Section title="Extensibility Notes" icon="🔧" accentColor={colors.phaseApproach} defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {solution.extensibility_notes.what_to_keep_stable && (
              <div style={{ padding: 12, backgroundColor: colors.successMuted, borderRadius: 8, borderLeft: `3px solid ${colors.success}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 8 }}>
                  Keep Stable
                        </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.extensibility_notes.what_to_keep_stable.map((item: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: colors.textSecondary, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ color: colors.success }}>•</span>
                      <MarkdownText text={item} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
            {solution.extensibility_notes.what_to_change && (
              <div style={{ padding: 12, backgroundColor: colors.warningMuted, borderRadius: 8, borderLeft: `3px solid ${colors.warning}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.warning, textTransform: 'uppercase', marginBottom: 8 }}>
                  Changes in This Part
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.extensibility_notes.what_to_change.map((item: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: colors.textSecondary, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ color: colors.warning }}>→</span>
                      <MarkdownText text={item} />
                                  </li>
                                ))}
                              </ul>
                        </div>
                      )}
            {solution.extensibility_notes.interfaces_and_boundaries && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8, border: `1px solid ${colors.borderSubtle}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                  Interfaces & Boundaries
                        </div>
                <div style={{ fontSize: 13, color: colors.textSecondary }}>
                  <MarkdownText text={solution.extensibility_notes.interfaces_and_boundaries} />
                </div>
                        </div>
                      )}
            {solution.extensibility_notes.invariants && solution.extensibility_notes.invariants.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.infoMuted, borderRadius: 8, borderLeft: `3px solid ${colors.info}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>
                  Invariants to Maintain
                    </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.extensibility_notes.invariants.map((item: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: colors.textSecondary, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ color: colors.info }}>≡</span>
                      <MarkdownText text={item} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                </div>
              </Section>
            )}

      {/* Extensibility & Follow-ups - Main format */}
      {solution.extensibility_and_followups && (
        <Section title="Extensibility & Follow-ups" icon="🚀" accentColor={colors.phaseMaster} defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {solution.extensibility_and_followups.design_principles && solution.extensibility_and_followups.design_principles.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.phaseMaster, textTransform: 'uppercase', marginBottom: 8 }}>
                  Design Principles
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {solution.extensibility_and_followups.design_principles.map((p: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: colors.textSecondary }}>
                      <MarkdownText text={p} />
                    </li>
                  ))}
                </ul>
                  </div>
            )}
            {solution.extensibility_and_followups.why_this_design_scales && (
              <div style={{ padding: 12, backgroundColor: colors.successMuted, borderRadius: 8, borderLeft: `3px solid ${colors.success}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 8 }}>
                  Why This Design Scales
                </div>
                <div style={{ fontSize: 13, color: colors.textSecondary }}>
                  <MarkdownText text={solution.extensibility_and_followups.why_this_design_scales} />
                </div>
              </div>
            )}
            {solution.extensibility_and_followups.expected_followup_hooks && solution.extensibility_and_followups.expected_followup_hooks.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.infoMuted, borderRadius: 8, borderLeft: `3px solid ${colors.info}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>
                  Expected Follow-up Hooks
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {solution.extensibility_and_followups.expected_followup_hooks.map((h: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: colors.textSecondary, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ color: colors.info }}>→</span>
                      <MarkdownText text={h} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {solution.extensibility_and_followups.invariants && solution.extensibility_and_followups.invariants.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8, border: `1px solid ${colors.borderSubtle}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                  Invariants
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.extensibility_and_followups.invariants.map((inv: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: colors.textSecondary, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ color: colors.info }}>≡</span>
                      <MarkdownText text={inv} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {solution.approaches && solution.approaches.length > 0 && (
        <Section title="Approaches Comparison" icon="🔄" defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {solution.approaches.map((approach: any, i: number) => {
              const isOptimal = approach.name.toLowerCase().includes('optimal') || i === solution.approaches!.length - 1
              return (
                <div key={i} style={{
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: isOptimal ? colors.successMuted : colors.bgGraphite,
                  border: `1px solid ${isOptimal ? 'rgba(34, 197, 94, 0.3)' : colors.borderSubtle}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, color: colors.textBright }}>
                      {isOptimal && <span style={{ color: colors.success, marginRight: 4 }}>✓</span>}
                          {approach.name}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ padding: '2px 8px', fontSize: 11, fontFamily: fonts.mono, backgroundColor: colors.bgCarbon, borderRadius: 4, color: colors.textSecondary }}>
                        T: {approach.time_complexity}
                          </span>
                      <span style={{ padding: '2px 8px', fontSize: 11, fontFamily: fonts.mono, backgroundColor: colors.bgCarbon, borderRadius: 4, color: colors.textSecondary }}>
                        S: {approach.space_complexity}
                          </span>
                        </div>
                    </div>
                  <MarkdownText text={approach.description} className="" />
                  {/* Show why_not_optimal for non-optimal approaches */}
                  {approach.why_not_optimal && (
                    <div style={{ 
                      marginTop: 10, 
                      padding: '8px 12px', 
                      backgroundColor: colors.warningMuted, 
                      borderRadius: 6,
                      borderLeft: `3px solid ${colors.warning}`,
                      fontSize: 13,
                      color: colors.textSecondary
                    }}>
                      <span style={{ color: colors.warning, fontWeight: 600 }}>Why not optimal: </span>
                      <MarkdownText text={approach.why_not_optimal} />
                  </div>
                  )}
                  {/* Show key_insight for optimal approach */}
                      {approach.key_insight && (
                    <div style={{ 
                      marginTop: 10, 
                      padding: '8px 12px', 
                      backgroundColor: colors.successMuted, 
                      borderRadius: 6,
                      borderLeft: `3px solid ${colors.success}`,
                      fontSize: 13,
                      color: colors.textSecondary
                    }}>
                      <span style={{ color: colors.success, fontWeight: 600 }}>💡 Key Insight: </span>
                      <MarkdownText text={approach.key_insight} />
                        </div>
                      )}
                  {/* Pros and Cons */}
                  {(approach.pros || approach.cons) && (
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {approach.pros && approach.pros.length > 0 && (
                        <div style={{ padding: 10, backgroundColor: colors.successMuted, borderRadius: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 6 }}>Pros</div>
                          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {approach.pros.map((pro: string, pi: number) => (
                              <li key={pi} style={{ fontSize: 12, color: colors.textSecondary, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                <span style={{ color: colors.success }}>+</span> {pro}
                              </li>
                            ))}
                          </ul>
                    </div>
                      )}
                      {approach.cons && approach.cons.length > 0 && (
                        <div style={{ padding: 10, backgroundColor: colors.errorMuted, borderRadius: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: colors.error, textTransform: 'uppercase', marginBottom: 6 }}>Cons</div>
                          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {approach.cons.map((con: string, ci: number) => (
                              <li key={ci} style={{ fontSize: 12, color: colors.textSecondary, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                <span style={{ color: colors.error }}>-</span> {con}
                              </li>
                            ))}
                          </ul>
                  </div>
                      )}
                    </div>
                  )}
                  {/* When to use */}
                  {approach.when_to_use && (
                    <div style={{ marginTop: 10, padding: '8px 12px', backgroundColor: colors.infoMuted, borderRadius: 6, fontSize: 12, color: colors.textSecondary }}>
                      <span style={{ color: colors.info, fontWeight: 600 }}>When to use: </span>
                      <MarkdownText text={approach.when_to_use} />
                    </div>
                  )}
                      {approach.pseudocode && (
                    <div style={{ marginTop: 12 }}>
                      <ASCIIBlock content={approach.pseudocode} title="Pseudocode" />
                    </div>
                          )}
                            </div>
              )
            })}
                </div>
              </Section>
            )}

      {/* Assumptions */}
      {solution.assumptions && solution.assumptions.length > 0 && (
        <Section title="Assumptions" icon="📝" accentColor={colors.info} defaultOpen={false}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {solution.assumptions.map((assumption: string, i: number) => (
              <li key={i} style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: 8, 
                fontSize: 14, 
                color: colors.textSecondary,
                padding: '8px 12px',
                backgroundColor: colors.infoMuted,
                borderRadius: 6
              }}>
                <span style={{ color: colors.info }}>•</span>
                <MarkdownText text={assumption} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {solution.visual_explanation && (
        <Section title="Visual Explanation" icon="👁️" defaultOpen={true}>
          {/* Main format */}
          {solution.visual_explanation.problem_visualization && (
            <ASCIIBlock content={solution.visual_explanation.problem_visualization} title="Problem Visualization" />
          )}
          {solution.visual_explanation.data_structure_state && (
            <div style={{ marginTop: 16 }}>
              <ASCIIBlock content={solution.visual_explanation.data_structure_state} title="Data Structure State" />
                        </div>
                      )}
          {/* Follow-up format */}
          {solution.visual_explanation.before_after && (
            <ASCIIBlock content={solution.visual_explanation.before_after} title="Before / After" />
          )}
          {/* Algorithm Flow - can be string OR array of steps */}
          {solution.visual_explanation.algorithm_flow && (
            <div style={{ marginTop: 16 }}>
              {typeof solution.visual_explanation.algorithm_flow === 'string' ? (
                <ASCIIBlock content={solution.visual_explanation.algorithm_flow} title="Algorithm Flow" />
              ) : Array.isArray(solution.visual_explanation.algorithm_flow) ? (
                  <div>
                  <div style={{ 
                    fontSize: 11, 
                    fontWeight: 700, 
                    color: colors.textMuted, 
                    textTransform: 'uppercase', 
                    marginBottom: 12 
                  }}>
                    Algorithm Flow
                    </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {solution.visual_explanation.algorithm_flow.map((step: any, i: number) => (
                      <div key={i} style={{ 
                        padding: 12, 
                        backgroundColor: colors.bgGraphite, 
                        borderRadius: 8,
                        borderLeft: `3px solid ${colors.emberWarm}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                          <span style={{ 
                            width: 28, 
                            height: 28, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            backgroundColor: colors.phaseApproach, 
                            color: '#FFFFFF',
                            borderRadius: '50%',
                            fontSize: 13,
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {step.step || i + 1}
                          </span>
                          <div style={{ fontSize: 14, fontWeight: 500, color: colors.textBright }}>
                            <MarkdownText text={step.description} />
                        </div>
                    </div>
                        {step.visualization && (
                          <div style={{ 
                            backgroundColor: colors.bgVoid, 
                            padding: 12, 
                            borderRadius: 6,
                            marginBottom: 8
                          }}>
                            <pre style={{ 
                              margin: 0, 
                              fontSize: 12, 
                              fontFamily: fonts.mono,
                              color: colors.textSecondary,
                              whiteSpace: 'pre-wrap'
                            }}>
                              {cleanCodeBlock(step.visualization)}
                            </pre>
                  </div>
                )}
                        {step.key_point && (
                          <div style={{ 
                            fontSize: 13, 
                            color: colors.phaseApproach, 
                            marginTop: 4,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 6
                          }}>
                            <span>💡</span>
                            <MarkdownText text={step.key_point} />
                  </div>
                )}
                        </div>
                      ))}
                    </div>
                </div>
              ) : null}
                  </div>
                )}
          {/* Dry Run Table in visual explanation */}
          {solution.visual_explanation.dry_run_table && (
            <div style={{ marginTop: 16 }}>
              <div style={{ 
                fontSize: 11, 
                fontWeight: 700, 
                color: colors.textMuted, 
                textTransform: 'uppercase', 
                marginBottom: 8 
              }}>
                Dry Run Table
                        </div>
              <div style={{ 
                backgroundColor: colors.bgVoid, 
                padding: 12, 
                borderRadius: 8,
                overflow: 'auto'
              }}>
                <MarkdownText text={solution.visual_explanation.dry_run_table} className="" />
                    </div>
                  </div>
                )}
              </Section>
            )}
                  </div>
  )
}

function PhaseSolution({ solution }: { solution: PracticeSolution }) {
  const [activeCodeTab, setActiveCodeTab] = useState<'python' | 'java'>('python')
  const hasPython = hasCode(solution.solution_python_lines, solution.solution_python)
  const hasJava = hasCode(solution.solution_java_lines, solution.solution_java)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {solution.communication_script?.while_coding && solution.communication_script.while_coding.length > 0 && (
        <InterviewTip title="While coding, say">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {solution.communication_script.while_coding.slice(0, 3).map((tip: string, i: number) => (
              <li key={i} style={{ fontStyle: 'italic' }}>"{tip}"</li>
            ))}
          </ul>
        </InterviewTip>
      )}

      {(hasPython || hasJava) && (
        <Section title="Solution Code" icon="💻" accentColor={colors.phaseSolution}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {hasPython && (
                    <button
                      onClick={() => setActiveCodeTab('python')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: activeCodeTab === 'python' ? colors.phaseSolution : colors.bgGraphite,
                  color: activeCodeTab === 'python' ? 'white' : colors.textSecondary
                }}
              >
                Python
                    </button>
                  )}
            {hasJava && (
                    <button
                      onClick={() => setActiveCodeTab('java')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: activeCodeTab === 'java' ? colors.phaseSolution : colors.bgGraphite,
                  color: activeCodeTab === 'java' ? 'white' : colors.textSecondary
                }}
              >
                Java
                    </button>
                  )}
                </div>

          {activeCodeTab === 'python' && hasPython && (
                <CodeBlock
              code={getCodeString(solution.solution_python_lines, solution.solution_python)}
              language="python"
              title="Python Solution"
            />
          )}
          {activeCodeTab === 'java' && hasJava && (
            <CodeBlock
              code={getCodeString(solution.solution_java_lines, solution.solution_java)}
              language="java"
              title="Java Solution"
            />
          )}
        </Section>
      )}

      {solution.code_walkthrough && solution.code_walkthrough.length > 0 && (
        <Section title="Line-by-Line Walkthrough" icon="📖" defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {solution.code_walkthrough.map((item: any, i: number) => (
              <div key={i} style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {item.lines && (
                    <span style={{
                      padding: '2px 8px',
                      fontSize: 11,
                      fontFamily: fonts.mono,
                      backgroundColor: colors.bgCarbon,
                      color: colors.emberWarm,
                      borderRadius: 4
                    }}>
                      Lines {item.lines}
                            </span>
                          )}
                  {item.section && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: colors.textBright }}>{item.section}</span>
                  )}
                </div>
                <MarkdownText text={item.explanation} className="" />
                        </div>
                      ))}
                    </div>
              </Section>
            )}

            {solution.complexity_analysis && (
        <Section title="Complexity Analysis" icon="📊" accentColor={colors.info} defaultOpen={true}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Time Complexity */}
            <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 12 }}>
                Time Complexity
              </div>
                    {typeof solution.complexity_analysis.time === 'object' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Handle new_methods (follow-up format) */}
                  {solution.complexity_analysis.time.new_methods && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 6 }}>New Methods</div>
                      {Object.entries(solution.complexity_analysis.time.new_methods).map(([method, details]: [string, any]) => (
                        <div key={method} style={{ padding: 8, backgroundColor: colors.bgCarbon, borderRadius: 4, marginBottom: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: colors.textBright, fontWeight: 500 }}>{method}</span>
                            <code style={{ fontFamily: fonts.mono, color: colors.emberWarm, fontSize: 12 }}>
                              {typeof details === 'object' ? details.complexity : details}
                            </code>
                          </div>
                          {typeof details === 'object' && details.explanation && (
                            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{details.explanation}</div>
                          )}
                          </div>
                        ))}
                      </div>
                  )}
                  {/* Handle modified_methods (follow-up format) */}
                  {solution.complexity_analysis.time.modified_methods && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: colors.warning, textTransform: 'uppercase', marginBottom: 6 }}>Modified Methods</div>
                      {Object.entries(solution.complexity_analysis.time.modified_methods).map(([method, details]: [string, any]) => (
                        <div key={method} style={{ padding: 8, backgroundColor: colors.warningMuted, borderRadius: 4, borderLeft: `3px solid ${colors.warning}`, marginBottom: 4 }}>
                          <div style={{ fontWeight: 500, color: colors.textBright, marginBottom: 4 }}>{method}</div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: colors.textMuted }}>Was:</span>
                              <code style={{ fontFamily: fonts.mono, color: colors.error, padding: '1px 4px', backgroundColor: colors.bgCarbon, borderRadius: 3 }}>
                                {details.was}
                              </code>
                      </div>
                            <span style={{ color: colors.textMuted }}>→</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: colors.textMuted }}>Now:</span>
                              <code style={{ fontFamily: fonts.mono, color: colors.success, padding: '1px 4px', backgroundColor: colors.bgCarbon, borderRadius: 3 }}>
                                {details.now}
                              </code>
                            </div>
                          </div>
                          {details.explanation && (
                            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{details.explanation}</div>
                          )}
                        </div>
                      ))}
                      </div>
                    )}
                  {/* Handle overall_change (follow-up format) */}
                  {solution.complexity_analysis.time.overall_change && (
                    <div style={{ padding: 8, backgroundColor: colors.warningMuted, borderRadius: 4, borderLeft: `2px solid ${colors.warning}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: colors.warning, textTransform: 'uppercase', marginBottom: 4 }}>Overall Change</div>
                      <div style={{ fontSize: 13, color: colors.textSecondary }}>{solution.complexity_analysis.time.overall_change}</div>
                  </div>
                    )}
                  {/* Handle regular object format with method names */}
                  {!solution.complexity_analysis.time.new_methods && !solution.complexity_analysis.time.overall_change && (
                    <>
                      {/* Render individual methods with complexity badges */}
                      {Object.entries(solution.complexity_analysis.time)
                        .filter(([key]) => key !== 'overall')
                        .map(([method, details]: [string, any]) => (
                          <div key={method} style={{
                            padding: 8,
                            backgroundColor: colors.bgCarbon,
                            borderRadius: 4,
                            marginBottom: 4,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{ color: colors.textBright, fontWeight: 500, fontFamily: fonts.mono, fontSize: 13 }}>
                              {method}:
                            </span>
                            <code style={{
                              fontFamily: fonts.mono,
                              color: colors.success,
                              fontSize: 12,
                              backgroundColor: colors.successMuted,
                              padding: '2px 8px',
                              borderRadius: 4
                            }}>
                              {typeof details === 'object' ? details.complexity : details}
                            </code>
                          </div>
                        ))
                      }
                      {/* Render overall summary separately */}
                      {(solution.complexity_analysis.time as any).overall && (
                        <div style={{
                          marginTop: 8,
                          padding: 10,
                          backgroundColor: colors.successMuted,
                          borderRadius: 6,
                          borderLeft: `3px solid ${colors.success}`
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 4 }}>
                            Overall
                          </div>
                          <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5 }}>
                            {String((solution.complexity_analysis.time as any).overall)}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 16, color: colors.textBright }}>
                  <MarkdownText text={solution.complexity_analysis.time} />
                      </div>
                    )}
                  </div>
            {/* Space Complexity */}
            <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 12 }}>
                Space Complexity
              </div>
                    {typeof solution.complexity_analysis.space === 'object' ? (
                <div>
                  {solution.complexity_analysis.space.additional_space && (
                    <div style={{ fontSize: 16, color: colors.textBright, marginBottom: 8 }}>
                      <MarkdownText text={solution.complexity_analysis.space.additional_space} />
                          </div>
                  )}
                  {solution.complexity_analysis.space.complexity && (
                    <div style={{ fontSize: 16, color: colors.textBright, marginBottom: 8 }}>
                      <MarkdownText text={solution.complexity_analysis.space.complexity} />
                      </div>
                  )}
                  {solution.complexity_analysis.space.explanation && (
                    <div style={{ fontSize: 13, color: colors.textMuted }}>
                      <MarkdownText text={solution.complexity_analysis.space.explanation} />
                      </div>
                    )}
                  {solution.complexity_analysis.space.breakdown && (
                    <MarkdownText text={solution.complexity_analysis.space.breakdown} className="" />
                    )}
                  </div>
              ) : (
                <div style={{ fontSize: 16, color: colors.textBright }}>
                  <MarkdownText text={solution.complexity_analysis.space} />
                </div>
              )}
            </div>
          </div>
                {solution.complexity_analysis.can_we_do_better && (
            <div style={{ marginTop: 16, padding: 12, backgroundColor: colors.bgCarbon, borderRadius: 8, border: `1px solid ${colors.borderSubtle}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                Can We Do Better?
              </div>
              <MarkdownText text={solution.complexity_analysis.can_we_do_better} className="" />
                  </div>
                )}
              </Section>
            )}

      {solution.common_mistakes && solution.common_mistakes.length > 0 && (
        <Section title="Common Mistakes" icon="🚫" accentColor={colors.error} defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {solution.common_mistakes.map((m: any, i: number) => (
              <div key={i} style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: colors.error }}>✗</span>
                  <MarkdownText text={m.mistake} className="" />
                </div>
                {m.why_wrong && (
                  <div style={{ marginLeft: 20, fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>
                    <MarkdownText text={m.why_wrong} />
                  </div>
                )}
                {m.correct_approach && (
                  <div style={{ marginLeft: 20, padding: 8, backgroundColor: colors.successMuted, borderRadius: 4, borderLeft: `2px solid ${colors.success}` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase' }}>Correct: </span>
                    <MarkdownText text={m.correct_approach} className="" />
                  </div>
                )}
                      </div>
                    ))}
                  </div>
        </Section>
      )}
    </div>
  )
}

function PhaseVerify({ solution }: { solution: PracticeSolution }) {
  const { theme } = useTheme()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {solution.communication_script?.after_coding && (
        <InterviewTip title="After coding, say">
          <p style={{ fontStyle: 'italic', margin: 0 }}>"{solution.communication_script.after_coding}"</p>
        </InterviewTip>
      )}

      {solution.dry_run && (
        <Section title="Dry Run / Trace" icon="🔬" defaultOpen={true} accentColor={colors.phaseVerify}>
          {/* Main format */}
          {solution.dry_run.example && (
            <div style={{
              padding: 14,
              backgroundColor: theme.bgObsidian,
              borderRadius: 8,
              marginBottom: 16,
              border: `1px solid ${theme.borderMedium}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.phaseVerify, textTransform: 'uppercase', marginBottom: 8 }}>
                Example
              </div>
              <code style={{
                fontSize: 13,
                fontFamily: fonts.mono,
                lineHeight: 1.6,
                display: 'block',
              }}>
                <StyledCodeExample code={solution.dry_run.example} themeColors={theme} />
              </code>
            </div>
          )}
                {solution.dry_run.trace_table && (
                  <DryRunTable tableText={solution.dry_run.trace_table} themeColors={theme} />
                )}
          {solution.dry_run.final_answer && (
            <div style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: theme.successMuted,
              borderRadius: 8,
              border: `1px solid ${theme.success}40`
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.success, textTransform: 'uppercase', marginBottom: 4 }}>
                Final Answer
              </div>
              <div style={{ fontSize: 18, fontFamily: fonts.mono, color: theme.success }}>
                <MarkdownText text={solution.dry_run.final_answer} />
              </div>
            </div>
          )}
          {/* Follow-up format: example_input + steps */}
          {solution.dry_run.example_input && (
            <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Example Input
              </div>
              <code style={{ 
                fontSize: 12, 
                color: colors.emberWarm, 
                fontFamily: fonts.mono,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                display: 'block'
              }}>
                {solution.dry_run.example_input}
              </code>
            </div>
          )}
          {solution.dry_run.steps && solution.dry_run.steps.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                Step-by-Step Trace
              </div>
              {solution.dry_run.steps.map((step: any, i: number) => (
                <div key={i} style={{ 
                  padding: 12, 
                  backgroundColor: colors.bgGraphite, 
                  borderRadius: 8,
                  borderLeft: `3px solid ${colors.emberWarm}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ 
                      width: 24, 
                      height: 24, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: colors.emberGlow, 
                      color: colors.bgVoid,
                      borderRadius: '50%',
                      fontSize: 12,
                      fontWeight: 700
                    }}>
                          {step.step}
                        </span>
                    <code style={{ fontSize: 13, color: colors.emberWarm, fontFamily: fonts.mono }}>
                      {step.action}
                    </code>
                        </div>
                  {step.state && (
                    <div style={{ 
                      marginBottom: 8, 
                      padding: 8, 
                      backgroundColor: colors.bgVoid, 
                      borderRadius: 4,
                      fontSize: 12,
                      fontFamily: fonts.mono,
                      color: colors.textSecondary
                    }}>
                      {step.state}
                    </div>
                  )}
                  {step.explanation && (
                    <div style={{ fontSize: 13, color: colors.textMuted }}>
                      {step.explanation}
                    </div>
                  )}
                      </div>
                    ))}
                  </div>
                )}
          {/* Follow-up format: expected_output */}
          {solution.dry_run.expected_output && (
            <div style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: colors.successMuted,
              borderRadius: 8,
              border: `1px solid rgba(34, 197, 94, 0.3)`
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 4 }}>
                Expected Output
              </div>
              <code style={{ fontSize: 14, fontFamily: fonts.mono, fontWeight: 700, color: colors.success }}>
                {solution.dry_run.expected_output}
              </code>
                  </div>
                )}
          {/* Follow-up format: final_output */}
          {solution.dry_run.final_output && (
            <div style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: colors.successMuted,
              borderRadius: 8,
              border: `1px solid rgba(34, 197, 94, 0.3)`
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 4 }}>
                Final Output
              </div>
              <div style={{ fontSize: 14, color: colors.success }}>
                <MarkdownText text={solution.dry_run.final_output} />
              </div>
                  </div>
                )}
              </Section>
            )}

      {solution.test_cases && solution.test_cases.length > 0 && (
        <Section title="Test Cases" icon="🧪" accentColor={colors.success}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {solution.test_cases.map((tc: any, i: number) => (
              <div key={i} style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: colors.textBright }}>{tc.name}</div>
                        {tc.category && (
                    <span style={{ padding: '2px 8px', fontSize: 11, backgroundColor: colors.bgCarbon, color: colors.textMuted, borderRadius: 4 }}>
                      {tc.category}
                    </span>
                        )}
                      </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, fontFamily: fonts.mono }}>
                        <div>
                    <span style={{ color: colors.textMuted }}>Input: </span>
                    <span style={{ color: colors.textSecondary }}>{tc.input}</span>
                        </div>
                        <div>
                    <span style={{ color: colors.textMuted }}>Expected: </span>
                    <span style={{ color: colors.success }}>{tc.expected}</span>
                        </div>
                      </div>
                      {tc.explanation && (
                  <div style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}>
                          <MarkdownText text={tc.explanation} />
                        </div>
                      )}
                      {tc.gotcha && (
                  <div style={{ marginTop: 8, padding: '6px 10px', fontSize: 12, backgroundColor: colors.warningMuted, color: colors.warning, borderRadius: 6, borderLeft: `3px solid ${colors.warning}` }}>
                    <span style={{ marginRight: 6 }}>⚠</span>
                    <MarkdownText text={tc.gotcha} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

      {/* Edge Cases - top-level array (follow-up format) */}
      {solution.edge_cases && solution.edge_cases.length > 0 && (
        <Section title="Edge Cases" icon="🔍" accentColor={colors.warning} defaultOpen={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {solution.edge_cases.map((edge: any, i: number) => (
              <div key={i} style={{ 
                padding: 12, 
                backgroundColor: colors.bgGraphite, 
                borderRadius: 8,
                borderLeft: `3px solid ${colors.warning}`
              }}>
                {typeof edge === 'string' ? (
                  <MarkdownText text={edge} />
                ) : (
                  <>
                    {edge.case && (
                      <div style={{ fontWeight: 500, color: colors.textBright, marginBottom: 4 }}>
                        {edge.case}
                        </div>
                      )}
                    {/* Main format */}
                    {edge.expected && (
                      <div style={{ fontSize: 13, color: colors.textSecondary }}>
                        <span style={{ color: colors.textMuted }}>Expected: </span>
                        {edge.expected}
                        </div>
                      )}
                    {edge.why_important && (
                      <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                        {edge.why_important}
                            </div>
                    )}
                    {/* Follow-up format: handling + gotcha */}
                    {edge.handling && (
                      <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                        <MarkdownText text={edge.handling} />
                          </div>
                    )}
                    {edge.gotcha && (
                      <div style={{ 
                        marginTop: 8, 
                        padding: '6px 10px', 
                        fontSize: 12, 
                        backgroundColor: colors.warningMuted, 
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6
                      }}>
                        <span style={{ color: colors.warning }}>⚠</span>
                        <MarkdownText text={edge.gotcha} />
                      </div>
                    )}
                  </>
                )}
                          </div>
            ))}
          </div>
        </Section>
      )}

      {/* Debugging Strategy - main format */}
      {solution.debugging_strategy && (
        <Section title="Debugging Strategy" icon="🐛" accentColor={colors.warning} defaultOpen={true}>
          {solution.debugging_strategy.how_to_test_incrementally && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                How to Test Incrementally
              </div>
              <MarkdownText text={solution.debugging_strategy.how_to_test_incrementally} className="" />
                        </div>
                      )}
          {solution.debugging_strategy.what_to_print_or_assert && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                What to Print/Assert
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {solution.debugging_strategy.what_to_print_or_assert.map((item: string, i: number) => (
                  <code key={i} style={{
                    display: 'block',
                    fontSize: 12,
                    backgroundColor: colors.bgVoid,
                    color: colors.emberWarm,
                    padding: 8,
                    borderRadius: 4,
                    fontFamily: fonts.mono
                  }}>
                    {item}
                  </code>
                ))}
              </div>
                        </div>
                      )}
          {solution.debugging_strategy.common_failure_modes && (
                          <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Common Failure Modes
                            </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {solution.debugging_strategy.common_failure_modes.map((mode: string, i: number) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: colors.textSecondary }}>
                    <span style={{ color: colors.error }}>•</span>
                    <MarkdownText text={mode} />
                  </li>
                ))}
              </ul>
                          </div>
          )}
        </Section>
      )}

      {/* Debugging Playbook - follow-up format */}
      {solution.debugging_playbook && (
        <Section title="Debugging Playbook" icon="🐛" accentColor={colors.warning} defaultOpen={true}>
          {solution.debugging_playbook.fast_sanity_checks && solution.debugging_playbook.fast_sanity_checks.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 8 }}>
                Fast Sanity Checks
                            </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {solution.debugging_playbook.fast_sanity_checks.map((check: string, i: number) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: colors.textSecondary }}>
                    <span style={{ color: colors.success }}>✓</span>
                    <MarkdownText text={check} />
                  </li>
                ))}
              </ul>
                        </div>
                      )}
          {solution.debugging_playbook.likely_bugs && solution.debugging_playbook.likely_bugs.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.error, textTransform: 'uppercase', marginBottom: 8 }}>
                Likely Bugs
                    </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {solution.debugging_playbook.likely_bugs.map((bug: string, i: number) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: colors.textSecondary }}>
                    <span style={{ color: colors.error }}>⚠</span>
                    <MarkdownText text={bug} />
                  </li>
                ))}
              </ul>
                </div>
                      )}
          {solution.debugging_playbook.recommended_logs_or_asserts && solution.debugging_playbook.recommended_logs_or_asserts.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                Recommended Logs/Asserts
                    </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {solution.debugging_playbook.recommended_logs_or_asserts.map((item: string, i: number) => (
                  <code key={i} style={{
                    display: 'block',
                    fontSize: 12,
                    backgroundColor: colors.bgVoid,
                    color: colors.emberWarm,
                    padding: 8,
                    borderRadius: 4,
                    fontFamily: fonts.mono
                  }}>
                    {item}
                  </code>
                  ))}
                </div>
            </div>
          )}
          {solution.debugging_playbook.how_to_localize && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>
                How to Localize Issues
              </div>
              <MarkdownText text={solution.debugging_playbook.how_to_localize} className="" />
            </div>
          )}
              </Section>
            )}
    </div>
  )
}

function PhaseMaster({ solution }: { solution: PracticeSolution }) {
  // Helper to get communication scripts (handles both main and follow-up formats)
  const commScript = solution.communication_script || {}
  const hasCommScript = Object.keys(commScript).length > 0
  
  // Helper to get interview tips (handles both formats)
  const interviewTips = solution.interview_tips || {}
  const hasInterviewTips = Object.keys(interviewTips).length > 0
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Communication Script - handles both main and follow-up formats */}
      {hasCommScript && (
        <Section title="Communication Script" icon="🎤" accentColor={colors.phaseMaster}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Main format: opening_verbatim */}
            {commScript.opening_verbatim && (
              <div style={{ padding: 12, backgroundColor: colors.phaseMasterBg, borderRadius: 8, borderLeft: `3px solid ${colors.phaseMaster}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.phaseMaster, textTransform: 'uppercase', marginBottom: 8 }}>Opening</div>
                <p style={{ fontSize: 14, color: colors.textPrimary, fontStyle: 'italic', margin: 0 }}>
                  "{commScript.opening_verbatim}"
                </p>
                  </div>
                )}
            {/* Follow-up format: transition_from_previous */}
            {commScript.transition_from_previous && (
              <div style={{ padding: 12, backgroundColor: colors.phaseMasterBg, borderRadius: 8, borderLeft: `3px solid ${colors.phaseMaster}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.phaseMaster, textTransform: 'uppercase', marginBottom: 8 }}>Transition from Previous Part</div>
                <p style={{ fontSize: 14, color: colors.textPrimary, fontStyle: 'italic', margin: 0 }}>
                  "{commScript.transition_from_previous}"
                </p>
                        </div>
            )}
            {/* Follow-up format: explaining_changes */}
            {commScript.explaining_changes && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>Explaining Changes</div>
                <p style={{ fontSize: 14, color: colors.textPrimary, fontStyle: 'italic', margin: 0 }}>
                  "{commScript.explaining_changes}"
                </p>
              </div>
            )}
            {/* Main format: while_coding */}
            {commScript.while_coding && commScript.while_coding.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>While Coding</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {commScript.while_coding.map((phrase: string, i: number) => (
                    <li key={i} style={{ fontSize: 14, color: colors.textSecondary, fontStyle: 'italic' }}>• "{phrase}"</li>
                  ))}
                </ul>
                    </div>
            )}
            {/* Follow-up format: while_extending_code */}
            {commScript.while_extending_code && commScript.while_extending_code.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>While Extending Code</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {commScript.while_extending_code.map((phrase: string, i: number) => (
                    <li key={i} style={{ fontSize: 14, color: colors.textSecondary, fontStyle: 'italic' }}>• "{phrase}"</li>
                  ))}
                </ul>
                  </div>
            )}
            {/* Main format: after_coding */}
            {commScript.after_coding && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>After Coding</div>
                <p style={{ fontSize: 14, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
                  "{commScript.after_coding}"
                </p>
              </div>
            )}
            {/* Follow-up format: after_completing */}
            {commScript.after_completing && (
              <div style={{ padding: 12, backgroundColor: colors.successMuted, borderRadius: 8, borderLeft: `3px solid ${colors.success}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 8 }}>After Completing</div>
                <p style={{ fontSize: 14, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
                  "{commScript.after_completing}"
                </p>
              </div>
            )}
            {/* Main format: when_stuck_verbatim */}
            {commScript.when_stuck_verbatim && (
              <div style={{ padding: 12, backgroundColor: colors.warningMuted, borderRadius: 8, borderLeft: `3px solid ${colors.warning}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.warning, textTransform: 'uppercase', marginBottom: 8 }}>When Stuck</div>
                <p style={{ fontSize: 14, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
                  "{commScript.when_stuck_verbatim}"
                </p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Interview Tips - handles both main and follow-up formats */}
      {hasInterviewTips && (
        <Section title="Interview Tips" icon="💡" accentColor={colors.info}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Main format: opening */}
            {interviewTips.opening && (
              <div style={{ padding: 12, backgroundColor: colors.emberFaint, borderRadius: 8, borderLeft: `3px solid ${colors.emberGlow}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.emberGlow, textTransform: 'uppercase', marginBottom: 8 }}>Opening Statement</div>
                <p style={{ fontSize: 14, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
                  "{interviewTips.opening}"
                </p>
                        </div>
            )}
            {/* Follow-up format: how_to_present */}
            {interviewTips.how_to_present && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>How to Present</div>
                <MarkdownText text={interviewTips.how_to_present} className="" />
              </div>
            )}
            {/* Main format: clarifying_questions_to_ask */}
            {interviewTips.clarifying_questions_to_ask && interviewTips.clarifying_questions_to_ask.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>Clarifying Questions to Ask</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {interviewTips.clarifying_questions_to_ask.map((q: string, i: number) => (
                    <li key={i} style={{ fontSize: 14, color: colors.textSecondary }}>
                      <MarkdownText text={`❓ ${q}`} />
                    </li>
                  ))}
                </ul>
                    </div>
            )}
            {/* Main format: what_to_mention_proactively */}
            {interviewTips.what_to_mention_proactively && interviewTips.what_to_mention_proactively.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.successMuted, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 8 }}>What to Mention Proactively</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {interviewTips.what_to_mention_proactively.map((item: string, i: number) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: colors.textSecondary }}>
                      <span style={{ color: colors.success }}>✓</span>
                      <MarkdownText text={item} />
                    </li>
                  ))}
                </ul>
                  </div>
            )}
            {/* Follow-up format: what_to_mention */}
            {interviewTips.what_to_mention && interviewTips.what_to_mention.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>What to Mention</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {interviewTips.what_to_mention.map((item: string, i: number) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: colors.textSecondary }}>
                      <span style={{ color: colors.info }}>→</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Main format: communication_during_coding */}
            {interviewTips.communication_during_coding && interviewTips.communication_during_coding.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>While Coding, Say</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {interviewTips.communication_during_coding.map((phrase: string, i: number) => (
                    <li key={i} style={{ fontSize: 14, color: colors.textSecondary, fontStyle: 'italic' }}>• "{phrase}"</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Main format: time_management */}
            {interviewTips.time_management && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.emberGlow, textTransform: 'uppercase', marginBottom: 8 }}>Time Management</div>
                <MarkdownText text={interviewTips.time_management} className="" />
              </div>
            )}
            {/* Follow-up format: time_allocation */}
            {interviewTips.time_allocation && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.emberGlow, textTransform: 'uppercase', marginBottom: 8 }}>Time Allocation</div>
                <MarkdownText text={interviewTips.time_allocation} className="" />
              </div>
            )}
            {/* Both formats: if_stuck */}
            {interviewTips.if_stuck && interviewTips.if_stuck.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.warningMuted, borderRadius: 8, borderLeft: `3px solid ${colors.warning}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.warning, textTransform: 'uppercase', marginBottom: 8 }}>If Stuck</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {interviewTips.if_stuck.map((item: string, i: number) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: colors.textSecondary }}>
                      <span style={{ color: colors.warning }}>•</span>
                      <MarkdownText text={item} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Interviewer Perspective - main format */}
      {solution.interviewer_perspective && (
        <Section title="Interviewer Perspective" icon="👁️" accentColor={colors.info}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {solution.interviewer_perspective.what_they_evaluate && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>What They Evaluate</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.interviewer_perspective.what_they_evaluate.map((item: string, i: number) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: colors.textSecondary }}>
                      <span style={{ color: colors.info }}>→</span>
                      <MarkdownText text={item} />
                        </li>
                      ))}
                    </ul>
                  </div>
            )}
            {solution.interviewer_perspective.bonus_points && (
              <div style={{ padding: 12, backgroundColor: colors.successMuted, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 8 }}>⭐ Bonus Points</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.interviewer_perspective.bonus_points.map((bp: string, i: number) => (
                    <li key={i} style={{ fontSize: 14, color: colors.textSecondary }}>+ {bp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Time Milestones - handles both formats */}
      {solution.time_milestones && (
        <Section title="Time Milestones" icon="⏱️" defaultOpen={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Follow-up format: time_budget */}
            {solution.time_milestones.time_budget && (
              <div style={{ padding: 12, backgroundColor: colors.emberFaint, borderRadius: 8, border: `1px solid ${colors.borderEmber}`, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.emberGlow, textTransform: 'uppercase', marginBottom: 4 }}>Time Budget</div>
                <MarkdownText text={solution.time_milestones.time_budget} className="" />
                  </div>
                )}
            {/* Follow-up format: by_2_min */}
            {solution.time_milestones.by_2_min && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, backgroundColor: colors.bgGraphite, borderRadius: 4 }}>
                <span style={{ width: 64, fontSize: 12, fontWeight: 700, color: colors.emberGlow }}>0-2 min</span>
                <span style={{ fontSize: 14, color: colors.textSecondary }}>{solution.time_milestones.by_2_min}</span>
              </div>
            )}
            {solution.time_milestones.by_5_min && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, backgroundColor: colors.bgGraphite, borderRadius: 4 }}>
                <span style={{ width: 64, fontSize: 12, fontWeight: 700, color: colors.emberGlow }}>0-5 min</span>
                <span style={{ fontSize: 14, color: colors.textSecondary }}>{solution.time_milestones.by_5_min}</span>
              </div>
            )}
            {solution.time_milestones.by_10_min && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, backgroundColor: colors.bgGraphite, borderRadius: 4 }}>
                <span style={{ width: 64, fontSize: 12, fontWeight: 700, color: colors.emberGlow }}>5-10 min</span>
                <span style={{ fontSize: 14, color: colors.textSecondary }}>{solution.time_milestones.by_10_min}</span>
              </div>
            )}
            {solution.time_milestones.by_20_min && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, backgroundColor: colors.bgGraphite, borderRadius: 4 }}>
                <span style={{ width: 64, fontSize: 12, fontWeight: 700, color: colors.emberGlow }}>10-20 min</span>
                <span style={{ fontSize: 14, color: colors.textSecondary }}>{solution.time_milestones.by_20_min}</span>
              </div>
            )}
            {solution.time_milestones.warning_signs && (
              <div style={{ marginTop: 8, padding: 12, backgroundColor: colors.warningMuted, borderRadius: 8, borderLeft: `3px solid ${colors.warning}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.warning, textTransform: 'uppercase', marginBottom: 4 }}>⚠ Warning Signs</div>
                <MarkdownText text={solution.time_milestones.warning_signs} className="" />
              </div>
            )}
          </div>
              </Section>
            )}

      {/* Recovery Strategies - handles both formats */}
      {solution.recovery_strategies && (
        <Section title="Recovery Strategies" icon="🆘" accentColor={colors.warning} defaultOpen={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Main format */}
            {solution.recovery_strategies.when_completely_stuck && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.warning, textTransform: 'uppercase', marginBottom: 8 }}>When Completely Stuck</div>
                <MarkdownText text={solution.recovery_strategies.when_completely_stuck} className="" />
                      </div>
                    )}
            {solution.recovery_strategies.when_you_make_a_bug && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.error, textTransform: 'uppercase', marginBottom: 8 }}>When You Make a Bug</div>
                <MarkdownText text={solution.recovery_strategies.when_you_make_a_bug} className="" />
                  </div>
            )}
            {/* Follow-up format */}
            {solution.recovery_strategies.if_part_builds_wrong && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.error, textTransform: 'uppercase', marginBottom: 8 }}>If Part Builds Wrong</div>
                <MarkdownText text={solution.recovery_strategies.if_part_builds_wrong} className="" />
              </div>
            )}
            {solution.recovery_strategies.if_new_requirement_unclear && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>If New Requirement Unclear</div>
                <MarkdownText text={solution.recovery_strategies.if_new_requirement_unclear} className="" />
              </div>
            )}
            {solution.recovery_strategies.if_running_behind && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.emberGlow, textTransform: 'uppercase', marginBottom: 8 }}>If Running Behind</div>
                <MarkdownText text={solution.recovery_strategies.if_running_behind} className="" />
              </div>
            )}
            {/* Main format: additional recovery strategies */}
            {solution.recovery_strategies.when_you_dont_know_syntax && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>When You Don't Know Syntax</div>
                <MarkdownText text={solution.recovery_strategies.when_you_dont_know_syntax} className="" />
              </div>
            )}
            {solution.recovery_strategies.when_approach_is_wrong && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.warning, textTransform: 'uppercase', marginBottom: 8 }}>When Approach Is Wrong</div>
                <MarkdownText text={solution.recovery_strategies.when_approach_is_wrong} className="" />
              </div>
            )}
            {solution.recovery_strategies.when_running_out_of_time && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.error, textTransform: 'uppercase', marginBottom: 8 }}>When Running Out of Time</div>
                <MarkdownText text={solution.recovery_strategies.when_running_out_of_time} className="" />
              </div>
            )}
          </div>
        </Section>
      )}

      {solution.final_checklist && (
        <Section title="Final Checklist" icon="✅" accentColor={colors.success} defaultOpen={false}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {solution.final_checklist.before_saying_done && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 8 }}>Before Saying "Done"</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.final_checklist.before_saying_done.map((item: string, i: number) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: colors.textSecondary }}>
                      <span style={{ color: colors.textMuted }}>☐</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                    )}
            {solution.final_checklist.quick_code_review && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>Quick Code Review</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.final_checklist.quick_code_review.map((item: string, i: number) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: colors.textSecondary }}>
                      <span style={{ color: colors.textMuted }}>☐</span> {item}
                    </li>
                  ))}
                </ul>
                  </div>
                )}
          </div>
              </Section>
            )}

      {/* Signal Points - handles both formats */}
      {solution.signal_points && (
        <Section title="Signal Points" icon="⭐" accentColor={colors.success} defaultOpen={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Main format: wow_factors */}
            {solution.signal_points.wow_factors && solution.signal_points.wow_factors.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.successMuted, borderRadius: 8, borderLeft: `3px solid ${colors.success}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 10 }}>⭐ Wow Factors</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {solution.signal_points.wow_factors.map((wf: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
                      <span style={{ color: colors.success }}>+</span>
                      <MarkdownText text={wf} />
                    </div>
                  ))}
                </div>
                  </div>
                )}
            {/* Follow-up format: wow_factors_for_followup */}
            {solution.signal_points.wow_factors_for_followup && solution.signal_points.wow_factors_for_followup.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.successMuted, borderRadius: 8, borderLeft: `3px solid ${colors.success}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 10 }}>⭐ Wow Factors for Follow-up</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {solution.signal_points.wow_factors_for_followup.map((wf: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
                      <span style={{ color: colors.success }}>+</span>
                      <MarkdownText text={wf} />
                    </div>
                  ))}
                </div>
                    </div>
            )}
            {/* Main format: subtle_signals_of_experience */}
            {solution.signal_points.subtle_signals_of_experience && solution.signal_points.subtle_signals_of_experience.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8, borderLeft: `3px solid ${colors.info}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 10 }}>💡 Subtle Signals of Experience</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {solution.signal_points.subtle_signals_of_experience.map((sig: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
                      <span style={{ color: colors.info }}>•</span>
                      <MarkdownText text={sig} />
                    </div>
                  ))}
                </div>
                  </div>
                )}
          </div>
              </Section>
            )}

      {/* Pattern Recognition - standalone */}
            {solution.pattern_recognition && (
        <Section title="Pattern Recognition" icon="🧩" accentColor={colors.info} defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {solution.pattern_recognition.pattern_name && (
              <div style={{ padding: 12, backgroundColor: colors.infoMuted, borderRadius: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: colors.info }}>
                  📌 {solution.pattern_recognition.pattern_name}
                </div>
              </div>
            )}
            {solution.pattern_recognition.indicators && solution.pattern_recognition.indicators.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 10 }}>Indicators</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {solution.pattern_recognition.indicators.map((ind: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
                      <span style={{ color: colors.info }}>•</span>
                      <MarkdownText text={ind} />
                    </div>
                  ))}
                </div>
                      </div>
                    )}
            {solution.pattern_recognition.similar_problems && solution.pattern_recognition.similar_problems.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>Similar Problems</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {solution.pattern_recognition.similar_problems.map((p: string, i: number) => (
                    <div key={i} style={{ fontSize: 13, color: colors.textSecondary }}>
                      <MarkdownText text={p} />
                    </div>
                  ))}
                </div>
                  </div>
            )}
            {solution.pattern_recognition.template && (
              <div style={{ padding: 12, backgroundColor: colors.bgVoid, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>Template</div>
                <pre style={{ 
                  margin: 0, 
                  fontSize: 12, 
                  fontFamily: fonts.mono,
                  color: colors.textSecondary,
                  whiteSpace: 'pre-wrap'
                }}>
                  {cleanCodeBlock(solution.pattern_recognition.template)}
                </pre>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* AI Copilot Tips */}
      {solution.ai_copilot_tips && (
        <Section title="AI Copilot Tips" icon="🤖" accentColor={colors.info} defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {solution.ai_copilot_tips.when_using_cursor_or_copilot && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>When Using Cursor/Copilot</div>
                <MarkdownText text={solution.ai_copilot_tips.when_using_cursor_or_copilot} className="" />
                        </div>
            )}
            {solution.ai_copilot_tips.what_to_do && solution.ai_copilot_tips.what_to_do.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.successMuted, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 8 }}>✓ What to Do</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.ai_copilot_tips.what_to_do.map((item: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: colors.textSecondary }}><MarkdownText text={item} /></li>
                  ))}
                </ul>
                    </div>
            )}
            {solution.ai_copilot_tips.what_not_to_do && solution.ai_copilot_tips.what_not_to_do.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.errorMuted, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.error, textTransform: 'uppercase', marginBottom: 8 }}>✗ What NOT to Do</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.ai_copilot_tips.what_not_to_do.map((item: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: colors.textSecondary }}><MarkdownText text={item} /></li>
                  ))}
                </ul>
                  </div>
                )}
          </div>
        </Section>
      )}

      {/* Red Flags to Avoid */}
      {solution.red_flags_to_avoid && (
        <Section title="Red Flags to Avoid" icon="🚩" accentColor={colors.error} defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {solution.red_flags_to_avoid.behavioral && solution.red_flags_to_avoid.behavioral.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.warning, textTransform: 'uppercase', marginBottom: 8 }}>Behavioral</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.red_flags_to_avoid.behavioral.map((item: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: colors.textSecondary, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ flexShrink: 0 }}>🚩</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {solution.red_flags_to_avoid.technical && solution.red_flags_to_avoid.technical.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.error, textTransform: 'uppercase', marginBottom: 8 }}>Technical</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.red_flags_to_avoid.technical.map((item: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: colors.textSecondary, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ flexShrink: 0 }}>🚩</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {solution.red_flags_to_avoid.communication && solution.red_flags_to_avoid.communication.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>Communication</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.red_flags_to_avoid.communication.map((item: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: colors.textSecondary, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ flexShrink: 0 }}>🚩</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Production Considerations */}
      {solution.production_considerations && (
        <Section title="Production Considerations" icon="🏭" accentColor={colors.info} defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {solution.production_considerations.what_id_add_in_production && solution.production_considerations.what_id_add_in_production.length > 0 && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.success, textTransform: 'uppercase', marginBottom: 8 }}>What I'd Add in Production</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {solution.production_considerations.what_id_add_in_production.map((item: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: colors.textSecondary }}><MarkdownText text={item} /></li>
                  ))}
                </ul>
              </div>
            )}
            {solution.production_considerations.why_not_in_interview && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>Why Not in Interview</div>
                <MarkdownText text={solution.production_considerations.why_not_in_interview} className="" />
              </div>
            )}
            {solution.production_considerations.how_to_mention && (
              <div style={{ padding: 12, backgroundColor: colors.infoMuted, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 8 }}>How to Mention</div>
                <MarkdownText text={solution.production_considerations.how_to_mention} className="" />
              </div>
            )}
          </div>
              </Section>
            )}

            {/* Follow-up Preparation */}
            {solution.follow_up_preparation && (
        <Section title="Follow-up Preparation" icon="➡️" defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {solution.follow_up_preparation.part_2_hint && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 4 }}>Part 2 Hint</div>
                <MarkdownText text={solution.follow_up_preparation.part_2_hint} className="" />
                  </div>
                )}
                {solution.follow_up_preparation.part_3_hint && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 4 }}>Part 3 Hint</div>
                <MarkdownText text={solution.follow_up_preparation.part_3_hint} className="" />
              </div>
            )}
            {solution.follow_up_preparation.part_4_hint && (
              <div style={{ padding: 12, backgroundColor: colors.bgGraphite, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.info, textTransform: 'uppercase', marginBottom: 4 }}>Part 4 Hint</div>
                <MarkdownText text={solution.follow_up_preparation.part_4_hint} className="" />
                  </div>
                )}
                {solution.follow_up_preparation.data_structure_evolution && (
              <div style={{ padding: 12, backgroundColor: colors.emberFaint, borderRadius: 8, borderLeft: `3px solid ${colors.emberGlow}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.emberGlow, textTransform: 'uppercase', marginBottom: 8 }}>Data Structure Evolution</div>
                <MarkdownText text={solution.follow_up_preparation.data_structure_evolution} className="" />
                  </div>
                )}
          </div>
              </Section>
            )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODAL
// ─────────────────────────────────────────────────────────────────────────────

// Inner component that uses Toast context
function PracticeSolutionModalInner({ isOpen, onClose, solution, problemTitle }: PracticeSolutionModalProps) {
  const [activePhase, setActivePhase] = useState<Phase>('understand')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const isMobile = useIsMobile(640)
  const { theme, isDark } = useTheme()
  const toast = useToast()
  const modalRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const titleId = useRef(`modal-title-${Math.random().toString(36).substr(2, 9)}`).current

  // Simulate loading state (for skeleton demo)
  useEffect(() => {
    if (isOpen && solution) {
      setIsLoading(true)
      const timer = setTimeout(() => setIsLoading(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, solution])

  useEffect(() => {
    if (isOpen) {
      setActivePhase('understand')
      setIsSearchOpen(false)
      setSearchQuery('')
    }
  }, [isOpen])

  // Phase navigation helpers
  const getAvailablePhases = useCallback(() => {
    if (!solution) return []
    const hasUnderstand = !!(solution.problem_analysis || solution.problem_understanding)
    const hasApproach = !!(solution.thinking_process || solution.approaches || solution.tradeoffs)
    const hasSolution = !!(hasCode(solution.solution_python_lines, solution.solution_python) || hasCode(solution.solution_java_lines, solution.solution_java))
    const hasVerify = !!(solution.dry_run || solution.test_cases || solution.debugging_strategy)
    const hasMaster = !!(solution.communication_script || solution.interviewer_perspective || solution.interview_tips)

    return [
      hasUnderstand && 'understand',
      hasApproach && 'approach',
      hasSolution && 'solution',
      hasVerify && 'verify',
      hasMaster && 'master',
    ].filter(Boolean) as Phase[]
  }, [solution])

  const goToNextPhase = useCallback(() => {
    const available = getAvailablePhases()
    const currentIndex = available.indexOf(activePhase)
    if (currentIndex < available.length - 1) {
      setActivePhase(available[currentIndex + 1])
    }
  }, [activePhase, getAvailablePhases])

  const goToPreviousPhase = useCallback(() => {
    const available = getAvailablePhases()
    const currentIndex = available.indexOf(activePhase)
    if (currentIndex > 0) {
      setActivePhase(available[currentIndex - 1])
    }
  }, [activePhase, getAvailablePhases])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: onClose,
    onArrowLeft: goToPreviousPhase,
    onArrowRight: goToNextPhase,
    onSlash: () => setIsSearchOpen(true),
    enabled: isOpen,
  })

  // Swipe gestures for mobile
  const swipeRef = useSwipeGestures<HTMLDivElement>({
    onSwipeLeft: goToNextPhase,
    onSwipeRight: goToPreviousPhase,
    enabled: isMobile && isOpen,
  })

  // Focus trap - focus modal on open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen || !solution) return null

  // Detect content for each phase - handles both main and follow-up formats
  const hasUnderstand = !!(solution.problem_analysis || solution.problem_understanding)
  const hasApproach = !!(solution.thinking_process || solution.approaches || solution.tradeoffs || solution.requirements_coverage || solution.assumptions || solution.visual_explanation)
  const hasSolution = !!(hasCode(solution.solution_python_lines, solution.solution_python) || hasCode(solution.solution_java_lines, solution.solution_java) || solution.complexity_analysis || solution.code_walkthrough)
  const hasVerify = !!(solution.dry_run || solution.test_cases || solution.debugging_strategy || solution.debugging_playbook || solution.edge_cases)
  const hasMaster = !!(solution.communication_script || solution.interviewer_perspective || solution.time_milestones || solution.recovery_strategies || solution.interview_tips || solution.signal_points)

  const phases = [
    { id: 'understand' as Phase, icon: '🎯', label: 'Understand', hasContent: hasUnderstand },
    { id: 'approach' as Phase, icon: '🧠', label: 'Approach', hasContent: hasApproach },
    { id: 'solution' as Phase, icon: '💻', label: 'Solution', hasContent: hasSolution },
    { id: 'verify' as Phase, icon: '✅', label: 'Verify', hasContent: hasVerify },
    { id: 'master' as Phase, icon: '🏆', label: 'Master', hasContent: hasMaster },
  ]

  // Keyboard navigation for tabs
  const handleTabKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const availablePhases = phases.filter(p => p.hasContent)
    const currentAvailableIndex = availablePhases.findIndex(p => p.id === phases[currentIndex].id)

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (currentAvailableIndex + 1) % availablePhases.length
      setActivePhase(availablePhases[nextIndex].id)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (currentAvailableIndex - 1 + availablePhases.length) % availablePhases.length
      setActivePhase(availablePhases[prevIndex].id)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActivePhase(availablePhases[0].id)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActivePhase(availablePhases[availablePhases.length - 1].id)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(91, 108, 249, 0.15) 0%, rgba(168, 85, 247, 0.15) 50%, rgba(236, 72, 153, 0.15) 100%)',
          backdropFilter: 'blur(8px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '0' : '32px 16px',
          overflow: 'hidden',
        }}
        onClick={onClose}
      >
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          className={isMobile ? 'mobile-modal-fullscreen' : ''}
          style={{
            backgroundColor: colors.bgObsidian,
            borderRadius: isMobile ? 0 : 20,
            border: isMobile ? 'none' : `1px solid ${colors.borderSubtle}`,
            boxShadow: isMobile ? 'none' : '0 25px 50px rgba(0, 0, 0, 0.15)',
            maxWidth: 1024,
            width: '100%',
            // Mobile height handled by .mobile-modal-fullscreen CSS class (fixes iOS Safari 100vh bug)
            ...(!isMobile ? {
              height: 'calc(100vh - 64px)',
              maxHeight: 'calc(100vh - 64px)',
            } : {}),
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            outline: 'none', // Remove focus outline on modal itself
          }}
        >
          {/* Header - Fixed, Mobile Responsive */}
          <div style={{
            padding: isMobile ? '12px 16px' : '20px 24px',
            background: `linear-gradient(135deg, ${colors.phaseUnderstand} 0%, ${colors.phaseApproach} 50%, ${colors.phaseMaster} 100%)`,
            borderBottom: `none`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 6 : 10 }}>
                <span style={{ fontSize: isMobile ? 20 : 28 }}>💎</span>
                <h2
                  id={titleId}
                  style={{
                    fontSize: isMobile ? 14 : 20,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    margin: 0,
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: isMobile ? 'nowrap' : 'normal'
                  }}
                >
                  {solution.problem_title || problemTitle || 'Solution'}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <DifficultyBadge difficulty={solution.difficulty} />
                {solution.category && (
                  <span style={{
                    padding: isMobile ? '2px 8px' : '4px 12px',
                    borderRadius: 20,
                    fontSize: isMobile ? 10 : 12,
                    fontWeight: 500,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: '#FFFFFF',
                    backdropFilter: 'blur(4px)',
                    display: isMobile ? 'none' : 'inline-flex'
                  }}>
                    {solution.category}
                  </span>
                )}
                {solution.estimated_time && (
                  <span style={{
                    padding: isMobile ? '2px 8px' : '4px 12px',
                    borderRadius: 20,
                    fontSize: isMobile ? 10 : 12,
                    fontWeight: 500,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: '#FFFFFF',
                    backdropFilter: 'blur(4px)'
                  }}>
                    ⏱️ {solution.estimated_time}
                  </span>
                )}
                {solution.part_number && (
                  <span style={{
                    padding: isMobile ? '2px 8px' : '4px 12px',
                    borderRadius: 20,
                    fontSize: isMobile ? 10 : 12,
                    fontWeight: 600,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}>
                    Part {solution.part_number}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                width: isMobile ? 32 : 40,
                height: isMobile ? 32 : 40,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(4px)',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'
              }}
            >
              <svg style={{ width: isMobile ? 16 : 20, height: isMobile ? 16 : 20, color: '#FFFFFF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Phase Tabs - Horizontal scroll on mobile */}
          <div
            role="tablist"
            aria-label="Solution phases"
            style={{
              padding: isMobile ? '8px 12px' : '16px 24px',
              backgroundColor: colors.bgCarbon,
              borderBottom: `1px solid ${colors.borderSubtle}`,
              display: 'flex',
              gap: isMobile ? 6 : 10,
              overflowX: 'auto',
              justifyContent: isMobile ? 'flex-start' : 'center',
              flexShrink: 0,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {phases.map((p, index) => (
              <PhaseTab
                key={p.id}
                icon={p.icon}
                label={p.label}
                isActive={activePhase === p.id}
                onClick={() => p.hasContent && setActivePhase(p.id)}
                hasContent={p.hasContent}
                phase={p.id}
                isMobile={isMobile}
                tabIndex={activePhase === p.id ? 0 : -1}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
              />
            ))}
          </div>

          {/* Search Bar */}
          <SearchBar
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSearch={setSearchQuery}
            placeholder="Search in solution... (Esc to close)"
          />

          {/* Content */}
          <div
            ref={(el) => {
              // Merge refs for swipe gestures
              if (swipeRef) (swipeRef as React.MutableRefObject<HTMLDivElement | null>).current = el
              if (contentRef) contentRef.current = el
            }}
            role="tabpanel"
            aria-label={`${activePhase} phase content`}
            className="light-scroll"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: isMobile ? 12 : 24,
              backgroundColor: colors.bgVoid
            }}
          >
            {/* Skeleton loading state */}
            {isLoading ? (
              <SkeletonModal />
            ) : (
              <>
            {activePhase === 'understand' && (
              <PhaseErrorBoundary phaseName="Understand">
                <PhaseUnderstand solution={solution} />
              </PhaseErrorBoundary>
            )}
            {activePhase === 'approach' && (
              <PhaseErrorBoundary phaseName="Approach">
                <PhaseApproach solution={solution} />
              </PhaseErrorBoundary>
            )}
            {activePhase === 'solution' && (
              <PhaseErrorBoundary phaseName="Solution">
                <PhaseSolution solution={solution} />
              </PhaseErrorBoundary>
            )}
            {activePhase === 'verify' && (
              <PhaseErrorBoundary phaseName="Verify">
                <PhaseVerify solution={solution} />
              </PhaseErrorBoundary>
            )}
            {activePhase === 'master' && (
              <PhaseErrorBoundary phaseName="Master">
                <PhaseMaster solution={solution} />
              </PhaseErrorBoundary>
            )}

            {solution.connection_to_next_part && (
              <div style={{
                marginTop: 24,
                padding: 12,
                background: `linear-gradient(135deg, ${colors.phaseApproachBg} 0%, ${colors.phaseMasterBg} 100%)`,
                borderRadius: 12,
                border: `1px solid ${colors.phaseApproach}`,
                boxShadow: '0 2px 8px rgba(168, 85, 247, 0.1)'
              }}>
                <h4 style={{ fontWeight: 600, color: colors.phaseApproach, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px 0' }}>
                  <span>➡️</span> Connection to Next Part
                </h4>
                <MarkdownText text={solution.connection_to_next_part} className="" />
              </div>
            )}
              </>
            )}
          </div>

          {/* Footer - Fixed, doesn't scroll */}
          <div style={{
            padding: '14px 24px',
            backgroundColor: colors.bgCarbon,
            borderTop: `1px solid ${colors.borderSubtle}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0, // Prevent footer from shrinking
          }}>
            <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 500 }}>
              {solution.generated_at && `Generated: ${new Date(solution.generated_at).toLocaleString()}`}
            </span>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: `linear-gradient(135deg, ${colors.phaseUnderstand} 0%, ${colors.phaseApproach} 100%)`,
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(91, 108, 249, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(91, 108, 249, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(91, 108, 249, 0.3)'
              }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Main export - wraps with ToastProvider
export function PracticeSolutionModal(props: PracticeSolutionModalProps) {
  return (
    <ToastProvider>
      <PracticeSolutionModalInner {...props} />
    </ToastProvider>
  )
}

export default PracticeSolutionModal
