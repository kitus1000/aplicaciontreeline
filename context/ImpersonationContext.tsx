'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/utils/supabase/client'

interface Employee {
  id_empleado: string
  numero_empleado: number
  nombre: string
  apellido_paterno: string
  apellido_materno?: string
  correo_electronico?: string
  rol?: string
}

interface ImpersonationContextType {
  impersonatedEmployee: Employee | null
  setImpersonatedEmployee: (emp: Employee | null) => void
  employeesList: Employee[]
  loadingEmployees: boolean
  clearImpersonation: () => void
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined)

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedEmployee, setImpersonatedEmployee] = useState<Employee | null>(null)
  const [employeesList, setEmployeesList] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  useEffect(() => {
    async function loadEmployees() {
      setLoadingEmployees(true)
      try {
        const { data } = await supabase
          .from('empleados')
          .select('id_empleado, numero_empleado, nombre, apellido_paterno, apellido_materno, correo_electronico')
          .order('nombre', { ascending: true })

        if (data) setEmployeesList(data)
      } catch (err) {
        console.error('Error loading employees for impersonation:', err)
      } finally {
        setLoadingEmployees(false)
      }
    }

    loadEmployees()
  }, [])

  const clearImpersonation = () => {
    setImpersonatedEmployee(null)
  }

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedEmployee,
        setImpersonatedEmployee,
        employeesList,
        loadingEmployees,
        clearImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext)
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider')
  }
  return context
}
