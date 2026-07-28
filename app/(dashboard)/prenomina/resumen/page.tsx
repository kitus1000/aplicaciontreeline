'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { 
  DollarSign, 
  Download, 
  Filter, 
  Plus, 
  Trash2, 
  Calculator,
  User,
  Clock,
  Briefcase,
  Calendar,
  ChevronRight,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { format, subDays, addDays } from 'date-fns'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'


export default function PayrollSummaryPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState({ 
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  })
  const [payrollData, setPayrollData] = useState<any[]>([])
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [selectedEmpForBonus, setSelectedEmpForBonus] = useState<any>(null)
  const [bonusForm, setBonusForm] = useState({ amount: 0, reason: '', type: 'performance' })

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetchData()
  }, [selectedPeriod, refreshKey])

  async function generatePDF(emp: any) {
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 10

      // ─── FETCH COMPANY DATA ─────────────────────────────────────────────
      const { data: empresa } = await supabase
        .from('configuracion_empresa')
        .select('*')
        .limit(1)
        .single()

      const nombreEmpresa = empresa?.nombre_empresa || 'Mi Empresa'
      const rfc = empresa?.rfc || ''
      const logoBase64 = empresa?.logo_base64 || ''
      const direccion = empresa?.direccion || ''

      // ─── PAGE FRAME (EXECUTIVE BORDER) ──────────────────────────────────
      doc.setDrawColor(200)
      doc.setLineWidth(0.5)
      doc.rect(5, 5, pageWidth - 10, pageHeight - 10)

      // ─── HEADER ────────────────────────────────────────────────────────
      doc.setFillColor(30, 41, 59) // Dark Slate
      doc.rect(5, 5, pageWidth - 10, 35, 'F')

      // Logo
      const logoSize = 25
      if (logoBase64 && logoBase64.startsWith('data:image')) {
        try {
          const ext = logoBase64.includes('image/png') ? 'PNG' : 'JPEG'
          doc.addImage(logoBase64, ext, 12, 10, logoSize, logoSize)
        } catch { /* ignore logo errors */ }
      }

      // Company info
      const textX = logoBase64 ? 45 : 15
      doc.setTextColor(255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text(nombreEmpresa.toUpperCase(), textX, 18)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(200)
      if (rfc) doc.text(`RFC: ${rfc}`, textX, 23)
      if (direccion) {
        const splitAddr = doc.splitTextToSize(direccion, 100)
        doc.text(splitAddr, textX, 28)
      }

      // Document Title & Period
      doc.setTextColor(255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(t('receipt_title').toUpperCase(), pageWidth - 12, 18, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`${selectedPeriod.start} — ${selectedPeriod.end}`, pageWidth - 12, 23, { align: 'right' })

      // ─── EMPLOYEE SECTION ───────────────────────────────────────────────
      let y = 50
      doc.setDrawColor(230)
      doc.setFillColor(249, 250, 251)
      doc.roundedRect(12, y, pageWidth - 24, 30, 2, 2, 'FD')

      doc.setTextColor(100)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('DATOS DEL EMPLEADO', 16, y + 6)
      
      doc.line(16, y + 8, pageWidth - 16, y + 8)

      const col1 = 16, col2 = 80, col3 = 140
      const contentY = y + 15
      doc.setTextColor(50)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      
      // Col 1
      doc.text(`${t('employee_name')}:`, col1, contentY)
      doc.setFont('helvetica', 'bold')
      doc.text(`${emp.nombre} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`, col1, contentY + 5)
      
      // Col 2
      doc.setFont('helvetica', 'normal')
      doc.text(`${t('receipt_dept')}:`, col2, contentY)
      doc.setFont('helvetica', 'bold')
      doc.text(emp.departamento || 'OPERACIONES', col2, contentY + 5)

      // Col 3
      doc.setFont('helvetica', 'normal')
      doc.text(`ID / ${t('pay_scheme')}:`, col3, contentY)
      doc.setFont('helvetica', 'bold')
      doc.text(`#${emp.numero_empleado || emp.id_empleado} / ${emp.rule?.toUpperCase() || '--'}`, col3, contentY + 5)

      // ─── ATTENDANCE TABLE ───────────────────────────────────────────────
      y = 90
      const tLeft = 12
      const tW = pageWidth - 24
      const tCols = { date: 12, in: 50, out: 85, hrs: 125, pay: 160 }

      // Header Table
      doc.setFillColor(51, 65, 85)
      doc.rect(tLeft, y, tW, 8, 'F')
      doc.setTextColor(255)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text(t('date').toUpperCase(), tCols.date + 2, y + 5.5)
      doc.text((t('check_in') || 'ENTRADA').toUpperCase(), tCols.in, y + 5.5)
      doc.text((t('check_out') || 'SALIDA').toUpperCase(), tCols.out, y + 5.5)
      doc.text((t('receipt_hours_total') || 'HORAS').toUpperCase(), tCols.hrs, y + 5.5)
      doc.text('SUBTOTAL', tCols.pay, y + 5.5)
      
      y += 8
      doc.setFont('helvetica', 'normal')

      // Fetch data
      const { data: dayDetails } = await supabase
        .from('workday_events')
        .select('*')
        .eq('employee_id', emp.id_empleado)
        .gte('date', selectedPeriod.start)
        .lte('date', selectedPeriod.end)
        .order('event_time', { ascending: true })

      const distinctDates = [...new Set((dayDetails || []).map((e: any) => e.date))].sort()

      distinctDates.forEach((date, idx) => {
        const dayEvents = dayDetails?.filter((e: any) => e.date === date) || []
        const entrada = dayEvents.find((e: any) => e.event_type === 'ENTRADA')?.event_time
        const salida = dayEvents.find((e: any) => e.event_type === 'SALIDA_FINAL')?.event_time
        let hrs = 0
        if (entrada && salida) {
          hrs = (new Date(salida).getTime() - new Date(entrada).getTime()) / 3600000
        }
        const rowPay = emp.rule === 'hora' ? hrs * (emp.hourly_rate || 0) : (emp.daily_rate || 0)

        // Row background
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(tLeft, y, tW, 7, 'F')
        }
        
        doc.setTextColor(30)
        doc.text(date, tCols.date + 2, y + 5)
        doc.text(entrada ? format(new Date(entrada), 'HH:mm') : '--:--', tCols.in, y + 5)
        doc.text(salida ? format(new Date(salida), 'HH:mm') : '--:--', tCols.out, y + 5)
        doc.text(`${hrs.toFixed(1)}h`, tCols.hrs, y + 5)
        doc.text(`$${rowPay.toFixed(2)}`, tCols.pay, y + 5)
        
        y += 7
        if (y > pageHeight - 60) {
          doc.addPage()
          // Re-draw border and header on new page? (Maybe just border for simplicity)
          doc.setDrawColor(200)
          doc.rect(5, 5, pageWidth - 10, pageHeight - 10)
          y = 20
        }
      })

      // ─── FINAL BREAKDOWN ────────────────────────────────────────────────
      y += 10
      const breakdownW = 80
      const breakX = pageWidth - margin - breakdownW
      
      doc.setDrawColor(200)
      doc.line(breakX, y, pageWidth - margin - 2, y)
      y += 6

      const drawBreakdownRow = (label: string, value: string, isTotal = false) => {
        doc.setFont('helvetica', isTotal ? 'bold' : 'normal')
        doc.setFontSize(isTotal ? 10 : 8)
        doc.setTextColor(isTotal ? 0 : 70)
        doc.text(label, breakX, y)
        doc.text(value, pageWidth - margin - 5, y, { align: 'right' })
        y += isTotal ? 10 : 6
      }

      // 1. Subtotal
      drawBreakdownRow('Subtotal Devengado:', `$${emp.subtotal.toFixed(2)}`)

      // 2. Individual Bonuses (Itemized here, once)
      if (emp.bonuses && emp.bonuses.length > 0) {
        emp.bonuses.forEach((b: any) => {
          drawBreakdownRow(`(+) ${b.reason || b.type}:`, `$${parseFloat(b.amount).toFixed(2)}`)
        })
      }

      // 3. Final Total
      y += 2
      doc.setFillColor(30, 41, 59)
      doc.rect(breakX - 2, y - 6, breakdownW, 10, 'F')
      doc.setTextColor(255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('TOTAL A PAGAR:', breakX + 2, y + 1)
      doc.text(`$${emp.total.toFixed(2)}`, pageWidth - margin - 5, y + 1, { align: 'right' })

      // ─── FOOTER ────────────────────────────────────────────────────────
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text(`Powered by Worktrack PRO · Documento Oficial de Nómina · ${nombreEmpresa}`, pageWidth / 2, pageHeight - 12, { align: 'center' })

      doc.save(`Recibo_Ejecutivo_${emp.nombre}_${selectedPeriod.end}.pdf`)
    } catch (err) {
      console.error('PDF Error:', err)
      alert('Error generando el PDF. Revisa la consola.')
    }
  }

  async function fetchData() {
    setLoading(true)
    try {
      const { data: emps } = await supabase.from('empleados').select('id_empleado, numero_empleado, nombre, apellido_paterno, apellido_materno').eq('estado_empleado', 'Activo')
      const { data: rawRules } = await supabase.from('employee_pay_rules').select('*')
      const rules = rawRules?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || []
      const globalRule = rules.find((r: any) => r.scope_type === 'global' && r.active)

      const { data: workdays } = await supabase
        .from('workday_approval_status')
        .select('*')
        .eq('status', 'authorized')
        .gte('date', selectedPeriod.start)
        .lte('date', selectedPeriod.end)

      const { data: activities } = await supabase
        .from('workday_activities')
        .select('*')
        .gte('date', selectedPeriod.start)
        .lte('date', selectedPeriod.end)

      // NEW: fetch attendance events to cross-verify hours
      const { data: events } = await supabase
        .from('workday_events')
        .select('*')
        .in('event_type', ['ENTRADA', 'SALIDA_FINAL'])
        .gte('date', selectedPeriod.start)
        .lte('date', selectedPeriod.end)

      const { data: bonuses } = await supabase
        .from('payroll_bonus')
        .select('*')
        .gte('date', selectedPeriod.start)
        .lte('date', selectedPeriod.end)

      const processed = emps?.map((emp: any) => {
        const empRule = rules.find((r: any) => r.scope_type === 'individual' && r.employee_id === emp.id_empleado && r.active) || globalRule
        const empWorkdays = workdays?.filter((w: any) => w.employee_id === emp.id_empleado) || []
        const empActivities = activities?.filter((a: any) => a.employee_id === emp.id_empleado) || []
        const empBonuses = bonuses?.filter((b: any) => b.employee_id === emp.id_empleado) || []
        const empEvents = events?.filter((e: any) => e.employee_id === emp.id_empleado) || []

        // Group events by date to compute real worked hours per day
        const dateMap: Record<string, {entrada?: string, salida?: string}> = {}
        for (const ev of empEvents) {
          if (!dateMap[ev.date]) dateMap[ev.date] = {}
          if (ev.event_type === 'ENTRADA') dateMap[ev.date].entrada = ev.event_time
          if (ev.event_type === 'SALIDA_FINAL') dateMap[ev.date].salida = ev.event_time
        }
        let realHoursWorked = 0
        for (const day of Object.values(dateMap)) {
          if (day.entrada && day.salida) {
            const diff = (new Date(day.salida).getTime() - new Date(day.entrada).getTime()) / 3600000
            realHoursWorked += diff
          }
        }
        realHoursWorked = Math.round(realHoursWorked * 10) / 10

        const reportedHours = empActivities.reduce((acc: number, a: any) => acc + (a.hours_dedicated || 0), 0)
        
        // AUTO-FALLBACK: Use whichever is higher (reported vs real check-ins) to guarantee they get paid
        const totalHours = reportedHours > 0 ? reportedHours : realHoursWorked
        
        // AUTO-FALLBACK for Days: If they don't have authorized workdays (e.g. no schedule), count the days they checked in
        const totalDays = empWorkdays.length > 0 ? empWorkdays.length : Object.keys(dateMap).length

        const hoursDelta = Math.round((reportedHours - realHoursWorked) * 10) / 10
        
        let subtotal = 0
        if (empRule?.payment_type === 'hora') {
          subtotal = totalHours * (empRule.hourly_rate || 0)
        } else if (empRule?.payment_type === 'dia') {
          subtotal = totalDays * (empRule.daily_rate || 0)
        } else {
          subtotal = (totalDays * (empRule?.daily_rate || 0))
        }

        const bonusTotal = empBonuses.reduce((acc: number, b: any) => acc + (b.amount || 0), 0)
        const total = subtotal + bonusTotal

        return {
          ...emp,
          totalHours,
          realHoursWorked,
          hoursDelta,
          totalDays,
          subtotal,
          bonusTotal,
          total,
          rule: empRule?.payment_type,
          hourly_rate: empRule?.hourly_rate || 0,
          daily_rate: empRule?.daily_rate || 0,
          departamento: emp.departamento || null,
          bonuses: empBonuses

        }
      })

      setPayrollData(processed || [])
      setEmployees(emps || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBonus = async () => {
    try {
      const amountFloat = parseFloat(String(bonusForm.amount))
      if (isNaN(amountFloat) || amountFloat <= 0) {
        alert('Por favor ingresa un monto válido mayor a 0.')
        return
      }
      if (!bonusForm.reason.trim()) {
        alert('Por favor ingresa un concepto / razón del bono.')
        return
      }
      const { error } = await supabase.from('payroll_bonus').insert([{
        employee_id: selectedEmpForBonus.id_empleado,
        amount: amountFloat,
        reason: bonusForm.reason.trim(),
        type: bonusForm.type || 'performance',
        bonus_type: bonusForm.type || 'performance',
        date: format(new Date(), 'yyyy-MM-dd'),
        period_start: selectedPeriod.start,
        period_end: selectedPeriod.end
      }])
      if (error) {
        console.error('Bonus insert error:', error)
        alert(`Error al guardar bono: ${error.message}`)
        return
      }
      // Reset form and close modal
      setBonusForm({ amount: 0, reason: '', type: 'performance' })
      setShowBonusModal(false)
      // Force data refresh by incrementing refreshKey
      setRefreshKey(prev => prev + 1)
    } catch (e) {
      console.error(e)
      alert('Error inesperado al guardar el bono.')
    }
  }

  const handleDeleteBonus = async (bonusId: string) => {
    if (!confirm('¿Seguro que deseas eliminar este bono?')) return
    try {
      const { error } = await supabase.from('payroll_bonus').delete().eq('id', bonusId)
      if (error) {
        throw error
      }
      setRefreshKey(prev => prev + 1)
    } catch (e: any) {
      console.error(e)
      alert('Error al eliminar bono. Es posible que no tengas permisos.')
    }
  }

  const exportToExcel = async () => {
    try {
      // Dynamically import exceljs and file-saver
      const exceljsModule = await import('exceljs');
      const ExcelJS = exceljsModule.default || exceljsModule;
      
      const fileSaverModule = await import('file-saver');
      const saveAs = fileSaverModule.default || fileSaverModule.saveAs || fileSaverModule;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Nómina', {
        views: [{ showGridLines: false }]
      });

    // Company Header
    worksheet.mergeCells('A1:I2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'REPORTE EJECUTIVO DE PRENÓMINA';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Subtitle
    worksheet.mergeCells('A3:I3');
    const subtitleCell = worksheet.getCell('A3');
    subtitleCell.value = `Período: ${selectedPeriod.start} a ${selectedPeriod.end}`;
    subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    subtitleCell.alignment = { horizontal: 'center' };
    
    worksheet.addRow([]);

    // Table Headers
    const headers = [
      'ID', 'EMPLEADO', 'ESQUEMA', 'HRS (REP.)', 'HRS (REAL)', 'DÍAS', 'SUBTOTAL', 'BONOS', 'TOTAL A PAGAR'
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    headerRow.height = 25;

    // Table Data
    let totalPayroll = 0;
    payrollData.forEach((p, idx) => {
      totalPayroll += p.total;
      const row = worksheet.addRow([
        `#${p.numero_empleado || p.id_empleado}`,
        `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim(),
        p.rule?.toUpperCase() || 'DÍA',
        p.totalHours,
        p.realHoursWorked,
        p.totalDays,
        p.subtotal,
        p.bonusTotal,
        p.total
      ]);

      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNumber) => {
        cell.font = { size: 10, color: { argb: 'FF1E293B' } };
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        // Format Currency for Subtotal, Bonos and Total
        if ([7, 8, 9].includes(colNumber)) {
          cell.numFmt = '"$"#,##0.00';
          cell.font = { bold: colNumber === 9, size: 10, color: { argb: colNumber === 9 ? 'FF047857' : 'FF1E293B' } };
        }
        if ([4, 5, 6].includes(colNumber)) {
          cell.alignment = { horizontal: 'center' };
        }
      });
    });

    // Summary Footer
    worksheet.addRow([]);
    const totalRow = worksheet.addRow(['', '', '', '', '', '', '', 'GRAN TOTAL:', totalPayroll]);
    totalRow.getCell(8).font = { bold: true, size: 12 };
    totalRow.getCell(8).alignment = { horizontal: 'right' };
    totalRow.getCell(9).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    totalRow.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    totalRow.getCell(9).numFmt = '"$"#,##0.00';
    totalRow.getCell(9).alignment = { horizontal: 'right' };

    // Column widths
    worksheet.getColumn(1).width = 10;
    worksheet.getColumn(2).width = 35;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 12;
    worksheet.getColumn(5).width = 12;
    worksheet.getColumn(6).width = 10;
    worksheet.getColumn(7).width = 15;
    worksheet.getColumn(8).width = 15;
    worksheet.getColumn(9).width = 18;

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Nomina_Ejecutiva_${selectedPeriod.end}.xlsx`);
    } catch (e) {
      console.error('Error exportando Excel:', e)
      alert('Error al generar el reporte de Excel. Verifica la consola para más detalles.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8 page-transition">
      {/* Header Futurista */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
            {t('menu_prepayroll').split(' ')[0]} <span className="text-indigo-400">{t('menu_prepayroll').split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">{t('daily_summary_desc')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-white/5 shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl border border-white/5">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <input 
              type="date" 
              value={selectedPeriod.start} 
              onChange={e => setSelectedPeriod(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent text-xs font-black text-white outline-none"
            />
          </div>
          <ChevronRight className="w-4 h-4 text-slate-700" />
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl border border-white/5">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <input 
              type="date" 
              value={selectedPeriod.end} 
              onChange={e => setSelectedPeriod(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent text-xs font-black text-white outline-none"
            />
          </div>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
          >
            <Download className="w-4 h-4" />
            {t('export')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: t('total_payroll'), value: payrollData.reduce((acc, p) => acc + p.total, 0), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: t('ops_hours'), value: payrollData.reduce((acc, p) => acc + p.totalHours, 0), icon: Clock, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: t('active_sessions'), value: payrollData.reduce((acc, p) => acc + p.totalDays, 0), icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: t('bonus_flow'), value: payrollData.reduce((acc, p) => acc + p.bonusTotal, 0), icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <div key={i} className="glass-dark p-6 rounded-3xl border border-white/5 shadow-2xl flex items-center space-x-5 hover:border-indigo-500/30 transition-all group">
            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner transition-transform group-hover:scale-110", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-white tabular-nums">
                {stat.label.includes(t('total_payroll')) || stat.label.includes(t('bonus_flow')) ? `$${stat.value.toLocaleString()}` : stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <div className="glass-dark rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-white/5 bg-white/2 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">{t('comparative_calculation')}</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-slate-800/20">
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('receipt_id')}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('table_employee')}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('hours_reported')}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('hours_checked')}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('days')}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('receipt_subtotal')}</th>
                <th className="px-6 py-5 text-[10px] font-black text-amber-400 uppercase tracking-widest">{t('receipt_bonuses')}</th>
                <th className="px-6 py-5 text-[10px] font-black text-emerald-400 uppercase tracking-widest">{t('total')}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">{t('syncing_network')}</p>
                  </td>
                </tr>
              ) : payrollData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                     <AlertCircle className="w-12 h-12 text-slate-700 mx-auto opacity-20 mb-4" />
                     <p className="text-slate-500 text-sm font-black uppercase tracking-widest italic">{t('no_records_today')}</p>
                  </td>
                </tr>
              ) : payrollData.map((p, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-5 text-xs font-black text-slate-500 tabular-nums">#{p.numero_empleado || p.id_empleado}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-[10px] font-black">
                        {p.nombre.charAt(0)}{p.apellido_paterno.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white leading-tight">{p.nombre} {p.apellido_paterno}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{p.rule || 'dia'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-300 tabular-nums">{p.totalHours}h</td>
                  <td className="px-6 py-5 text-sm font-bold text-indigo-300 tabular-nums">{p.realHoursWorked}h</td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-300 tabular-nums">{p.totalDays}</td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-300 tabular-nums">
                    ${p.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-5">
                    {p.bonusTotal > 0 ? (
                      <div className="flex flex-col gap-1">
                        {p.bonuses.map((b: any) => (
                          <div key={b.id} className="flex items-center justify-between gap-2 bg-amber-400/10 border border-amber-400/20 px-2 py-1.5 rounded-lg group/bonus">
                            <span className="text-xs font-black text-amber-400 tabular-nums whitespace-nowrap">+${parseFloat(b.amount).toFixed(2)}</span>
                            <span className="text-[10px] font-bold text-amber-300/80 truncate max-w-[80px]" title={b.reason}>{b.reason}</span>
                            <button 
                              onClick={() => handleDeleteBonus(b.id)} 
                              className="text-red-400/50 hover:text-red-400 opacity-0 group-hover/bonus:opacity-100 transition-all p-0.5 rounded-md hover:bg-red-400/10"
                              title="Eliminar bono"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-600 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-lg font-black text-emerald-400 tabular-nums">
                      ${p.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                         onClick={() => { setSelectedEmpForBonus(p); setShowBonusModal(true); }}
                         className="p-2 text-amber-400 hover:text-amber-300 transition-colors"
                         title={t('add_bonus')}
                       >
                         <PlusCircle className="w-5 h-5" />
                       </button>
                       <button 
                         onClick={() => generatePDF(p)}
                         className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all group-hover:border-indigo-500/30"
                       >
                         <FileText className="w-4 h-4 text-indigo-400" />
                         {t('receipt')}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bonus Modal - Implementation remains same but use t() */}
      {showBonusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
           <div className="glass-dark border border-white/5 w-full max-w-md rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-black text-white uppercase italic mb-6 tracking-tighter">
                {t('add_bonus')} <span className="text-indigo-400">PRO</span>
              </h3>
              <div className="space-y-4">
                 <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('amount')}</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-indigo-500 input-dark"
                      value={bonusForm.amount}
                      onChange={e => setBonusForm({...bonusForm, amount: parseFloat(e.target.value)})}
                    />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t('reason')}</label>
                    <textarea 
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-indigo-500 min-h-[100px] input-dark"
                      value={bonusForm.reason}
                      onChange={e => setBonusForm({...bonusForm, reason: e.target.value})}
                    />
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button onClick={() => setShowBonusModal(false)} className="flex-1 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">{t('cancel')}</button>
                    <button onClick={handleAddBonus} className="flex-[2] py-4 bg-indigo-600 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all">{t('save')}</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}

function FileText(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 0 0 0 2 2h4"/><path d="M9 13h6"/><path d="M9 17h6"/>
    </svg>
  )
}
