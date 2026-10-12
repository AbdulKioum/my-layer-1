import { useEffect } from 'react'
import { fmt, monthLabel } from '../utils'

export default function CostModal({ farm, rows, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const months = {}
  for (const r of rows) {
    const k = r.record_date.slice(0, 7)
    const m = (months[k] ||= { eggs: 0, sale: 0, feed: 0, medicine: 0, vaccine: 0 })
    m.eggs += r.totalEgg
    m.sale += r.eggPrice
    m.feed += r.feedTotal
    m.medicine += r.medicineCost
    m.vaccine += r.vaccineCost
  }
  const list = Object.keys(months)
    .sort()
    .map((k) => {
      const m = months[k]
      const cost = m.feed + m.medicine + m.vaccine
      return { key: k, ...m, cost, profit: m.sale - cost }
    })

  const total = list.reduce(
    (t, m) => ({
      eggs: t.eggs + m.eggs,
      sale: t.sale + m.sale,
      feed: t.feed + m.feed,
      medicine: t.medicine + m.medicine,
      vaccine: t.vaccine + m.vaccine,
      cost: t.cost + m.cost,
      profit: t.profit + m.profit,
    }),
    { eggs: 0, sale: 0, feed: 0, medicine: 0, vaccine: 0, cost: 0, profit: 0 }
  )

  const tone = (p) => (p < 0 ? 'neg' : p > 0 ? 'pos' : '')

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Cost details"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Cost Details: {farm.name}</h2>
          <button className="btn small alt" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="summary">
          <div>
            <span>Total Sale</span>
            <b>{fmt(total.sale)}</b>
          </div>
          <div>
            <span>Total Cost</span>
            <b>{fmt(total.cost)}</b>
          </div>
          <div>
            <span>Profit</span>
            <b className={tone(total.profit)}>{fmt(total.profit)}</b>
          </div>
        </div>

        <div className="tbl-wrap">
          <table className="data month">
            <thead>
              <tr>
                <th>Month</th>
                <th>Total Egg</th>
                <th>Sale</th>
                <th>Feed Cost</th>
                <th>Medicine Cost</th>
                <th>Vaccine Cost</th>
                <th>Total Cost</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {!list.length && (
                <tr>
                  <td colSpan={8} className="empty">
                    No records yet.
                  </td>
                </tr>
              )}
              {list.map((m) => (
                <tr key={m.key}>
                  <td>{monthLabel(m.key)}</td>
                  <td className="num">{fmt(m.eggs)}</td>
                  <td className="num">{fmt(m.sale)}</td>
                  <td className="num">{fmt(m.feed)}</td>
                  <td className="num">{fmt(m.medicine)}</td>
                  <td className="num">{fmt(m.vaccine)}</td>
                  <td className="num">{fmt(m.cost)}</td>
                  <td className={`num ${tone(m.profit)}`}>{fmt(m.profit)}</td>
                </tr>
              ))}
              {list.length > 0 && (
                <tr className="total-row">
                  <td>Total</td>
                  <td className="num">{fmt(total.eggs)}</td>
                  <td className="num">{fmt(total.sale)}</td>
                  <td className="num">{fmt(total.feed)}</td>
                  <td className="num">{fmt(total.medicine)}</td>
                  <td className="num">{fmt(total.vaccine)}</td>
                  <td className="num">{fmt(total.cost)}</td>
                  <td className={`num ${tone(total.profit)}`}>{fmt(total.profit)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
