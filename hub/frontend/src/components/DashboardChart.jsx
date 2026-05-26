import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function DashboardChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis dataKey="month" tick={{ fill: '#4A6B87', fontSize: 12 }} />
        <YAxis tick={{ fill: '#4A6B87', fontSize: 12 }} />
        <Tooltip contentStyle={{ background: '#112640', border: '1px solid #1a3a5c', borderRadius: 8, color: '#EEF2FF' }} />
        <Legend />
        <Bar dataKey="receita" fill="#009C3B" radius={[4, 4, 0, 0]} name="Receita" />
        <Bar dataKey="despesa" fill="#EF4444" radius={[4, 4, 0, 0]} name="Despesa" />
      </BarChart>
    </ResponsiveContainer>
  )
}
