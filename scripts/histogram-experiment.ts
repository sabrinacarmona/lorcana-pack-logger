/**
 * Histogram Feasibility Experiment
 *
 * Question: Can 3D color histograms distinguish Lorcana cards from each other
 * when comparing clean digital reference images?
 *
 * If same-ink cards from the same set are indistinguishable on CLEAN images,
 * no amount of phone camera tuning will fix it.
 *
 * Run: npx tsx scripts/histogram-experiment.ts
 */

const BINS = 4
const SAMPLE_SIZE = 64

// Real Lorcast CDN URLs — deliberately picking HARD cases:
// Three Emerald cards from the same set (similar palette = worst case)
// Plus cards from different inks and a different set for contrast
const TEST_CARDS = [
  {
    label: 'Pacha #102 (Emerald, Set 7)',
    url: 'https://cards.lorcast.io/card/digital/small/crd_b2930c4282b145fe8eabadae2c6567f9.avif?1740589508',
  },
  {
    label: 'Yzma #101 (Emerald, Set 7)',
    url: 'https://cards.lorcast.io/card/digital/small/crd_f373768f95114e078fb4d77cd3cdead2.avif?1740589504',
  },
  {
    label: 'Lady #100 (Emerald, Set 7)',
    url: 'https://cards.lorcast.io/card/digital/small/crd_923b464195ae4552b00f557378bc77a3.avif?1740589500',
  },
  {
    label: 'Chernabog #50 (Amethyst, Set 7)',
    url: 'https://cards.lorcast.io/card/digital/small/crd_557e4cc6a67e4683ab3a48a35fcf6372.avif?1740589298',
  },
  {
    label: 'Baymax #104 (None ink, Set 7)',
    url: 'https://cards.lorcast.io/card/digital/small/crd_98c983fba498470ba2ff0518902e8cc5.avif?1740589516',
  },
  {
    label: 'Aladdin #69 (Emerald, Set 1)',
    url: 'https://cards.lorcast.io/card/digital/small/crd_cae2a3157f7a42d782a2c3cefae01615.avif?1709690747',
  },
]

// ── Histogram math (identical to browser code) ────────────────────

function computeHistogram(rgba: Uint8Array): number[] {
  const totalBins = BINS * BINS * BINS
  const hist = new Array<number>(totalBins).fill(0)
  const binSize = 256 / BINS
  let count = 0

  for (let i = 0; i < rgba.length; i += 4) {
    const r = Math.min(Math.floor(rgba[i]! / binSize), BINS - 1)
    const g = Math.min(Math.floor(rgba[i + 1]! / binSize), BINS - 1)
    const b = Math.min(Math.floor(rgba[i + 2]! / binSize), BINS - 1)
    hist[r * BINS * BINS + g * BINS + b]!++
    count++
  }

  if (count > 0) {
    for (let i = 0; i < totalBins; i++) hist[i]! /= count
  }
  return hist
}

function chiSquared(a: number[], b: number[]): number {
  let dist = 0
  for (let i = 0; i < a.length; i++) {
    const sum = a[i]! + b[i]!
    if (sum > 1e-10) {
      const diff = a[i]! - b[i]!
      dist += (diff * diff) / sum
    }
  }
  return dist
}

// ── Image loading (sharp, no canvas needed) ───────────────────────

async function loadImage(url: string): Promise<Uint8Array> {
  const sharp = (await import('sharp')).default
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const buf = Buffer.from(await resp.arrayBuffer())

  // Resize to SAMPLE_SIZE and get raw RGBA pixels
  const { data } = await sharp(buf)
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return new Uint8Array(data)
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('Loading card images and computing histograms...\n')

  const loaded: { label: string; hist: number[] }[] = []
  for (const card of TEST_CARDS) {
    try {
      const rgba = await loadImage(card.url)
      const hist = computeHistogram(rgba)
      loaded.push({ label: card.label, hist })
      console.log(`  ✓ ${card.label}`)
    } catch (err) {
      console.log(`  ✗ ${card.label}: ${err}`)
    }
  }

  if (loaded.length < 2) {
    console.log('\nNot enough images loaded. Aborting.')
    return
  }

  console.log(`\n${'═'.repeat(70)}`)
  console.log(' PAIRWISE CHI-SQUARED DISTANCES')
  console.log(' (0 = identical, ~2 = completely different)')
  console.log(`${'═'.repeat(70)}\n`)

  const pairs: { a: string; b: string; dist: number }[] = []
  for (let i = 0; i < loaded.length; i++) {
    for (let j = i + 1; j < loaded.length; j++) {
      const dist = chiSquared(loaded[i]!.hist, loaded[j]!.hist)
      pairs.push({ a: loaded[i]!.label, b: loaded[j]!.label, dist })
    }
  }

  pairs.sort((a, b) => a.dist - b.dist)

  for (const p of pairs) {
    const bar = '█'.repeat(Math.min(Math.round(p.dist * 40), 60))
    const sameInk = p.a.includes('Emerald') && p.b.includes('Emerald')
    const tag = sameInk ? ' [SAME INK]' : ''
    console.log(`  ${p.dist.toFixed(4)}  ${bar}${tag}`)
    console.log(`    ${p.a}`)
    console.log(`    vs ${p.b}\n`)
  }

  // Self-distance sanity check
  const self = chiSquared(loaded[0]!.hist, loaded[0]!.hist)
  console.log(`  Self-distance (same image): ${self.toFixed(6)}\n`)

  // Analysis
  const sameInkDists = pairs
    .filter(p => p.a.includes('Emerald') && p.b.includes('Emerald'))
    .map(p => p.dist)
  const diffInkDists = pairs
    .filter(p => !(p.a.includes('Emerald') && p.b.includes('Emerald')))
    .map(p => p.dist)

  console.log(`${'═'.repeat(70)}`)
  console.log(' VERDICT')
  console.log(`${'═'.repeat(70)}`)

  if (sameInkDists.length > 0) {
    console.log(`\n  Same-ink (Emerald) distances:`)
    console.log(`    min: ${Math.min(...sameInkDists).toFixed(4)}`)
    console.log(`    max: ${Math.max(...sameInkDists).toFixed(4)}`)
    console.log(`    avg: ${(sameInkDists.reduce((a, b) => a + b, 0) / sameInkDists.length).toFixed(4)}`)
  }
  if (diffInkDists.length > 0) {
    console.log(`\n  Cross-ink distances:`)
    console.log(`    min: ${Math.min(...diffInkDists).toFixed(4)}`)
    console.log(`    max: ${Math.max(...diffInkDists).toFixed(4)}`)
    console.log(`    avg: ${(diffInkDists.reduce((a, b) => a + b, 0) / diffInkDists.length).toFixed(4)}`)
  }

  const worstSameInk = sameInkDists.length > 0 ? Math.min(...sameInkDists) : Infinity
  const bestCrossInk = diffInkDists.length > 0 ? Math.min(...diffInkDists) : 0

  console.log()
  if (worstSameInk < 0.05) {
    console.log('  ❌ FATAL: Same-ink Emerald cards are nearly indistinguishable.')
    console.log('     Color histograms CANNOT reliably tell these cards apart.')
    console.log('     Need a different feature (ink dot, collector number, etc).\n')
  } else if (worstSameInk < 0.15) {
    console.log('  ⚠️  WARNING: Same-ink cards have small distances.')
    console.log('     May work on clean digital images but will likely fail')
    console.log('     with phone camera noise added on top.\n')
  } else {
    console.log('  ✅ Same-ink cards show meaningful separation.')
    console.log(`     Minimum same-ink distance: ${worstSameInk.toFixed(4)}`)
    console.log(`     A threshold around ${(worstSameInk * 0.4).toFixed(3)} could work.\n`)
  }
}

main().catch(console.error)
