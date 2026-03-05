import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../services/api'

const Card = ({ label, value, color = '#00d4ff', sub }) => (
  <div style={{ background: '#161b27', border: '1px solid #1e293b', borderRadius: 12, padding: '20px 24px' }}>
    <p style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>{label}</p>
    <p style={{ color, fontSize: 28, fontWeight: 700 }}>{value}</p>
    {sub && <p style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>{sub}</p>}
  </div>
)

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [monthly, setMonthly] = useState([])

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data))
    api.get('/finance/monthly').then(r => setMonthly(r.data))
  }, [])

  if (!data) return <p style={{ color: '#64748b' }}>Carregando...</p>

  const { projects, finance, recent_transactions } = data
  const lucro = (parseFloat(finance.receita_mes) - parseFloat(finance.despesa_mes)).toFixed(2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <Card label="Projetos Ativos" value={projects.ativos} />
        <Card label="Em Manutenção" value={projects.manutencao} color="#f59e0b" />
        <Card label="Concluídos" value={projects.concluidos} color="#10b981" />
        <Card label="Receita do Mês" value={`R$ ${parseFloat(finance.receita_mes).toFixed(2)}`} color="#10b981" />
        <Card label="Despesas do Mês" value={`R$ ${parseFloat(finance.despesa_mes).toFixed(2)}`} color="#f87171" />
        <Card label="Lucro do Mês" value={`R$ ${lucro}`} color={lucro >= 0 ? '#10b981' : '#f87171'} />
        <Card label="A Receber" value={`R$ ${parseFloat(finance.a_receber).toFixed(2)}`} color="#f59e0b" sub="pagamentos pendentes" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: '#161b27', border: '1px solid #1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Receitas vs Despesas (6 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly}>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="receita" fill="#00d4ff" radius={[4,4,0,0]} name="Receita" />
              <Bar dataKey="despesa" fill="#f87171" radius={[4,4,0,0]} name="Despesa" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#161b27', border: '1px solid #1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Transações Recentes</h3>
          {recent_transactions.length === 0 ? <p style={{ color: '#475569' }}>Nenhuma transação</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recent_transactions.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e293b' }}>
                  <div>
                    <p style={{ fontSize: 14 }}>{t.description}</p>
                    <p style={{ fontSize: 12, color: '#64748b' }}>{t.project_name || 'Sem projeto'} · {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span style={{ color: t.type === 'receita' ? '#10b981' : '#f87171', fontWeight: 600 }}>
                    {t.type === 'receita' ? '+' : '-'} R$ {parseFloat(t.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
