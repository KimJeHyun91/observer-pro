import React, { useEffect, useRef, useState } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useWaterLevelLog } from '@/utils/hooks/useTunnelArea'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection'

type Props = { outsideIdx: number }
type LogItem = { created_at: string; water_level: number | string }

export default function WaterLevelChart({ outsideIdx }: Props) {
  const { socketService } = useSocketConnection()
  const { waterLevelLog, mutate } = useWaterLevelLog(outsideIdx)

  const [categories, setCategories] = useState<string[]>([])
  const [seriesData, setSeriesData] = useState<number[]>([])
  const timerRef = useRef<number | null>(null)

  /** 현재 시각을 기준으로 5분 간격 7개 라벨 생성 */
  const buildCategories = () => {
    const now = new Date()
    const roundedMin = Math.floor(now.getMinutes() / 5) * 5
    const end = new Date(now)
    end.setMinutes(roundedMin, 0, 0)

    const cats = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(end)
      d.setMinutes(end.getMinutes() - 5 * (6 - i))
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${hh}:${mm}`
    })
    setCategories(cats)
  }

  /** 응답 데이터 정렬/패딩 → 시리즈 구성 */
  const buildSeries = () => {
    const raw: number[] = Array.isArray(waterLevelLog?.result)
      ? (waterLevelLog!.result as LogItem[])
          .slice()
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          .map((r) => Number(r.water_level))
      : []

    const padded =
      raw.length >= 7 ? raw.slice(-7) : Array(7 - raw.length).fill(0).concat(raw)

    setSeriesData(padded)
  }

  // 최초 1회 라벨 구성
  useEffect(() => {
    buildCategories()
  }, [])

  // 데이터가 바뀌면 시리즈 재계산
  useEffect(() => {
    buildSeries()
  }, [waterLevelLog])

  // 소켓 수신 시 즉시 갱신
  useEffect(() => {
    if (!socketService) return
    const unSub = socketService.subscribe('tm_waterLevel-update', () => mutate())
    return () => unSub()
  }, [socketService, mutate])

  // 5분 경계 스케줄링: 경계 도달 시 mutate + 라벨 재계산
  useEffect(() => {
    // 컴포넌트가 뜨거나 outsideIdx 변경되면 즉시 한 번 최신화
    mutate()

    const scheduleNextTick = () => {
      const now = new Date()
      const next = new Date(now)

      // 다음 5분 경계 (00, 05, 10, …)
      const nextBlock = Math.ceil((now.getMinutes() + now.getSeconds() / 60) / 5) * 5
      if (nextBlock >= 60) {
        next.setHours(now.getHours() + 1, 0, 0, 0)
      } else {
        next.setMinutes(nextBlock, 0, 0)
      }

      const delay = next.getTime() - now.getTime()

      timerRef.current = window.setTimeout(() => {
        mutate()          // 최신 데이터 요청
        buildCategories() // x축 라벨도 경계에 맞춰 갱신
        scheduleNextTick()
      }, delay) as unknown as number
    }

    scheduleNextTick()
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [mutate, outsideIdx])

  const options: ApexOptions = {
    chart: {
      id: 'water-level-mini',
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      background: 'transparent',
    },
    xaxis: {
      categories,
      labels: { style: { fontSize: '10px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      max: 30,
      labels: { formatter: (v: number) => `${v}cm`, style: { fontSize: '10px' } },
    },
    grid: { borderColor: '#e0e0e0', padding: { right: 8, left: 8 } },
    stroke: { curve: 'smooth', width: 2 },
    colors: ['#3182CE'],
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => `${v} cm` } },
  }

  return (
    <Chart
      options={options}
      series={[{ name: '수위(cm)', data: seriesData }]}
      type="line"
      height="100%"
      width="100%"
    />
  )
}
