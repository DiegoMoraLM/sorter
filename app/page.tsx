"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Package,
  Search,
  BarChart3,
  AlertTriangle,
  QrCode,
  Scan,
  Clock,
  Star,
  Moon,
  Sun,
  Zap,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Move,
  FileText,
  Building,
  ArrowRight,
  Plus,
  Filter,
  RefreshCw,
  Archive,
  Download,
  Calendar,
  Layers,
  Grid3X3,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Box {
  id: string
  reference: string
  ot: string
  entryDate: Date
  expiryDate?: Date
  weight?: number
  priority: "low" | "medium" | "high"
  status: "available" | "reserved" | "damaged" | "in_transit" | "error"
  operator: string
  notes?: string
  client?: string
  category: string
  hasTask?: boolean
}

interface Task {
  id: string
  type: "move" | "pick" | "store" | "check" | "reserve"
  boxId?: string
  fromPosition?: { column: number; height: number }
  toPosition?: { column: number; height: number }
  priority: "low" | "medium" | "high"
  assignedTo: string
  status: "pending" | "in_progress" | "completed"
  createdAt: Date
  completedAt?: Date
  notes?: string
  estimatedTime?: number
}

const COLUMNS = 20
const HEIGHTS = 5
const MAX_BOXES_PER_HEIGHT = 5
const COLUMNS_PER_VIEW = 4 // Mostrar 4 columnas por vista para mejor distribución

const CATEGORIES = ["Electrónicos", "Ropa", "Alimentación", "Libros", "Herramientas", "Otros"]
const OPERATORS = ["Juan Pérez", "María García", "Carlos López", "Ana Martín"]
const BOX_COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"]

// Datos de ejemplo
const generateSampleBoxes = (): Box[] => {
  const sampleBoxes: Box[] = [
    {
      id: "BOX-001",
      reference: "REF-2024-001",
      ot: "OT-15847",
      entryDate: new Date(2024, 0, 15),
      expiryDate: new Date(2024, 11, 15),
      weight: 0.5,
      priority: "high",
      status: "available",
      operator: "Juan Pérez",
      client: "CLI-001",
      category: "Electrónicos",
      hasTask: true,
    },
    {
      id: "BOX-002",
      reference: "REF-2024-002",
      ot: "OT-15848",
      entryDate: new Date(2024, 0, 20),
      weight: 2.5,
      priority: "medium",
      status: "reserved",
      operator: "María García",
      client: "CLI-002",
      category: "Ropa",
    },
    {
      id: "BOX-003",
      reference: "REF-2024-003",
      ot: "OT-15849",
      entryDate: new Date(2024, 1, 1),
      expiryDate: new Date(2024, 6, 1),
      weight: 5.0,
      priority: "medium",
      status: "available",
      operator: "Carlos López",
      client: "CLI-003",
      category: "Alimentación",
    },
    {
      id: "BOX-004",
      reference: "REF-2024-004",
      ot: "OT-15850",
      entryDate: new Date(2024, 1, 10),
      weight: 3.2,
      priority: "low",
      status: "error",
      operator: "Ana Martín",
      client: "CLI-004",
      category: "Herramientas",
    },
    {
      id: "BOX-005",
      reference: "REF-2024-005",
      ot: "OT-15851",
      entryDate: new Date(2024, 1, 5),
      weight: 4.1,
      priority: "low",
      status: "damaged",
      operator: "Juan Pérez",
      client: "CLI-005",
      category: "Libros",
      notes: "Esquina dañada por humedad",
    },
    {
      id: "BOX-006",
      reference: "REF-2024-006",
      ot: "OT-15852",
      entryDate: new Date(2024, 1, 12),
      expiryDate: new Date(2024, 8, 12),
      weight: 0.4,
      priority: "high",
      status: "in_transit",
      operator: "María García",
      client: "CLI-006",
      category: "Electrónicos",
    },
  ]
  return sampleBoxes
}

export default function WarehouseManagement() {
  const [warehouse, setWarehouse] = useState<Box[][][]>(() => {
    const initial: Box[][][] = []
    for (let col = 0; col < COLUMNS; col++) {
      initial[col] = []
      for (let height = 0; height < HEIGHTS; height++) {
        initial[col][height] = []
      }
    }

    // Añadir cajas de ejemplo distribuidas en diferentes alturas
    const sampleBoxes = generateSampleBoxes()
    sampleBoxes.forEach((box, index) => {
      const col = index % COLUMNS
      const height = Math.floor(index / 3) % HEIGHTS
      initial[col][height].push(box)
    })

    return initial
  })

  const [currentColumnStart, setCurrentColumnStart] = useState(0)
  const [selectedBox, setSelectedBox] = useState<Box | null>(null)
  const [showBoxModal, setShowBoxModal] = useState(false)
  const [currentOperator, setCurrentOperator] = useState("Juan Pérez")
  const [darkMode, setDarkMode] = useState(false)
  const [scannerMode, setScannerMode] = useState(false)
  const [scannedCode, setScannedCode] = useState("")
  const [soundEnabled, setSoundEnabled] = useState(true)

  const [newBox, setNewBox] = useState({
    reference: "",
    ot: "",
    weight: "",
    priority: "medium" as const,
    status: "available" as const,
    category: "Otros",
    client: "",
    notes: "",
    expiryDays: "",
  })

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "TASK-001",
      type: "pick",
      boxId: "BOX-001",
      fromPosition: { column: 0, height: 0 },
      priority: "high",
      assignedTo: "Juan Pérez",
      status: "pending",
      createdAt: new Date(2024, 1, 15, 9, 30),
      notes: "Cliente esperando en recepción",
      estimatedTime: 15,
    },
    {
      id: "TASK-002",
      type: "move",
      boxId: "BOX-003",
      fromPosition: { column: 2, height: 0 },
      toPosition: { column: 5, height: 1 },
      priority: "medium",
      assignedTo: "María García",
      status: "in_progress",
      createdAt: new Date(2024, 1, 15, 10, 0),
      estimatedTime: 10,
    },
    {
      id: "TASK-003",
      type: "check",
      boxId: "BOX-005",
      fromPosition: { column: 4, height: 0 },
      priority: "high",
      assignedTo: "Carlos López",
      status: "pending",
      createdAt: new Date(2024, 1, 15, 8, 45),
      notes: "Verificar estado de daño reportado",
      estimatedTime: 20,
    },
  ])

  const [movements, setMovements] = useState<
    Array<{
      type: "add" | "remove" | "move" | "reserve"
      box: Box
      fromPosition?: { column: number; height: number }
      toPosition?: { column: number; height: number }
      timestamp: Date
      operator: string
    }>
  >([])

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")

  const audioRef = useRef<HTMLAudioElement>(null)

  // Generar código QR único
  const generateQRCode = () => {
    return `WH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
  }

  // Reproducir sonido de notificación
  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }

  // Generar código de referencia único
  const generateReference = () => {
    return `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
  }

  // Generar OT único
  const generateOT = () => {
    return `OT-${Math.floor(Math.random() * 90000) + 10000}`
  }

  // Crear tarea desde caja
  const createTaskFromBox = (box: Box, taskType: Task["type"], notes?: string) => {
    const position = findBoxPosition(box.id)
    if (!position) return

    const task: Task = {
      id: `TASK-${Date.now()}`,
      type: taskType,
      boxId: box.id,
      fromPosition: position,
      priority: box.priority,
      assignedTo: currentOperator,
      status: "pending",
      createdAt: new Date(),
      notes,
      estimatedTime: taskType === "pick" ? 10 : taskType === "move" ? 15 : 20,
    }

    setTasks((prev) => [task, ...prev])

    // Marcar la caja como que tiene tarea
    const newWarehouse = [...warehouse]
    const boxPosition = findBoxPosition(box.id)
    if (boxPosition) {
      const boxIndex = newWarehouse[boxPosition.column][boxPosition.height].findIndex((b) => b.id === box.id)
      if (boxIndex !== -1) {
        newWarehouse[boxPosition.column][boxPosition.height][boxIndex].hasTask = true
        setWarehouse(newWarehouse)
      }
    }

    toast({
      title: "✅ Tarea creada",
      description: `Tarea de ${taskType} para ${box.reference}`,
    })
    setShowBoxModal(false)
  }

  // Encontrar posición de una caja
  const findBoxPosition = (boxId: string) => {
    for (let col = 0; col < COLUMNS; col++) {
      for (let height = 0; height < HEIGHTS; height++) {
        const boxIndex = warehouse[col][height].findIndex((box) => box.id === boxId)
        if (boxIndex !== -1) {
          return { column: col, height, stackPosition: boxIndex }
        }
      }
    }
    return null
  }

  // Completar tarea
  const completeTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task && task.boxId) {
      // Quitar la marca de tarea de la caja
      const newWarehouse = [...warehouse]
      const boxPosition = findBoxPosition(task.boxId)
      if (boxPosition) {
        const boxIndex = newWarehouse[boxPosition.column][boxPosition.height].findIndex((b) => b.id === task.boxId)
        if (boxIndex !== -1) {
          newWarehouse[boxPosition.column][boxPosition.height][boxIndex].hasTask = false
          setWarehouse(newWarehouse)
        }
      }
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: "completed" as const, completedAt: new Date() } : task,
      ),
    )

    playNotificationSound()
    toast({
      title: "✅ Tarea completada",
      description: "La tarea ha sido marcada como completada",
    })
  }

  // Obtener estadísticas
  const getStats = () => {
    const allBoxes = warehouse.flat().flat()
    const totalBoxes = allBoxes.length
    const availableBoxes = allBoxes.filter((box) => box.status === "available").length
    const reservedBoxes = allBoxes.filter((box) => box.status === "reserved").length
    const damagedBoxes = allBoxes.filter((box) => box.status === "damaged").length
    const errorBoxes = allBoxes.filter((box) => box.status === "error").length
    const expiringBoxes = allBoxes.filter(
      (box) => box.expiryDate && new Date(box.expiryDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000,
    ).length

    const pendingTasks = tasks.filter((task) => task.status === "pending").length
    const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length

    return {
      totalBoxes,
      availableBoxes,
      reservedBoxes,
      damagedBoxes,
      errorBoxes,
      expiringBoxes,
      pendingTasks,
      inProgressTasks,
      capacityUsage: Math.round((totalBoxes / (COLUMNS * HEIGHTS * MAX_BOXES_PER_HEIGHT)) * 100),
      fullPositions: warehouse.flat().filter((stack) => stack.length >= MAX_BOXES_PER_HEIGHT).length,
    }
  }

  const stats = getStats()

  // Filtrar cajas
  const getFilteredBoxes = () => {
    const allBoxes = warehouse.flat().flat()
    return allBoxes.filter((box) => {
      const matchesSearch =
        !searchTerm ||
        box.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        box.ot.toLowerCase().includes(searchTerm.toLowerCase()) ||
        box.client?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = filterStatus === "all" || box.status === filterStatus
      const matchesPriority = filterPriority === "all" || box.priority === filterPriority
      const matchesCategory = filterCategory === "all" || box.category === filterCategory

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory
    })
  }

  // Obtener color de prioridad
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  // Obtener color de estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      case "reserved":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      case "damaged":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      case "in_transit":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
    }
  }

  // Obtener color de la caja
  const getBoxColor = (box: Box) => {
    if (box.status === "error" || box.status === "damaged") {
      return "#DC2626" // Rojo para errores
    }
    if (box.status === "reserved") {
      return "#2563EB" // Azul para reservadas
    }
    if (box.priority === "high") {
      return "#EA580C" // Naranja para alta prioridad
    }
    return "#059669" // Verde para disponibles
  }

  // Navegación entre columnas
  const navigateColumns = (direction: "left" | "right") => {
    if (direction === "right" && currentColumnStart + COLUMNS_PER_VIEW < COLUMNS) {
      setCurrentColumnStart(currentColumnStart + COLUMNS_PER_VIEW)
    } else if (direction === "left" && currentColumnStart > 0) {
      setCurrentColumnStart(Math.max(0, currentColumnStart - COLUMNS_PER_VIEW))
    }
  }

  // Obtener columnas visibles
  const getVisibleColumns = () => {
    return Array.from({ length: COLUMNS_PER_VIEW }, (_, i) => currentColumnStart + i).filter((col) => col < COLUMNS)
  }

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  useEffect(() => {
    if (selectedBox) {
      setShowBoxModal(true)
    }
  }, [selectedBox])

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-gray-900" : "bg-gray-50"} p-2 md:p-4`}
    >
      <audio ref={audioRef} preload="auto">
        <source
          src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT"
          type="audio/wav"
        />
      </audio>

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header mejorado */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              🏭 Control de Almacén
            </h1>
            <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Operario: <span className="font-medium">{currentOperator}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Package className="w-4 h-4 mr-1" />
              {stats.totalBoxes} cajas
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {stats.capacityUsage}% ocupado
            </Badge>
            {stats.pendingTasks > 0 && (
              <Badge variant="destructive" className="text-sm px-3 py-1">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {stats.pendingTasks} tareas
              </Badge>
            )}
          </div>
        </div>

        {/* Controles rápidos */}
        <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="operator">Operario:</Label>
                <Select value={currentOperator} onValueChange={setCurrentOperator}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
                {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>

              <Button
                variant={scannerMode ? "default" : "outline"}
                onClick={() => setScannerMode(!scannerMode)}
                className="flex items-center gap-2"
              >
                <Scan className="w-4 h-4" />
                Scanner
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scanner QR */}
        {scannerMode && (
          <Card className={`border-2 border-blue-500 ${darkMode ? "bg-gray-800" : ""}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Escáner de Referencia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Escanea o introduce la referencia..."
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      const foundBox = warehouse
                        .flat()
                        .flat()
                        .find((box) => box.reference === scannedCode || box.ot === scannedCode)
                      if (foundBox) {
                        setSelectedBox(foundBox)
                        toast({
                          title: "📱 Caja encontrada",
                          description: `${foundBox.reference}`,
                        })
                      } else {
                        toast({
                          title: "❌ No encontrada",
                          description: "No se encontró ninguna caja con esa referencia",
                          variant: "destructive",
                        })
                      }
                      setScannedCode("")
                    }
                  }}
                  className="text-lg"
                />
                <Button
                  onClick={() => {
                    const foundBox = warehouse
                      .flat()
                      .flat()
                      .find((box) => box.reference === scannedCode || box.ot === scannedCode)
                    if (foundBox) {
                      setSelectedBox(foundBox)
                      toast({
                        title: "📱 Caja encontrada",
                        description: `${foundBox.reference}`,
                      })
                    } else {
                      toast({
                        title: "❌ No encontrada",
                        description: "No se encontró ninguna caja con esa referencia",
                        variant: "destructive",
                      })
                    }
                    setScannedCode("")
                  }}
                  size="lg"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estadísticas mejoradas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
            <CardContent className="p-4 text-center">
              <Package className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{stats.totalBoxes}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>

          <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{stats.availableBoxes}</div>
              <div className="text-xs text-muted-foreground">Disponibles</div>
            </CardContent>
          </Card>

          <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{stats.reservedBoxes}</div>
              <div className="text-xs text-muted-foreground">Reservadas</div>
            </CardContent>
          </Card>

          <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
            <CardContent className="p-4 text-center">
              <XCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold">{stats.errorBoxes + stats.damagedBoxes}</div>
              <div className="text-xs text-muted-foreground">Con Error</div>
            </CardContent>
          </Card>

          <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-orange-500" />
              <div className="text-2xl font-bold">{stats.expiringBoxes}</div>
              <div className="text-xs text-muted-foreground">Por vencer</div>
            </CardContent>
          </Card>

          <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold">{stats.pendingTasks}</div>
              <div className="text-xs text-muted-foreground">Tareas</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="warehouse" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
            <TabsTrigger value="warehouse" className="flex items-center gap-2 py-3">
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Almacén</span>
            </TabsTrigger>
            <TabsTrigger value="quick-actions" className="flex items-center gap-2 py-3">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Acciones</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2 py-3">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Búsqueda</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2 py-3">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Tareas</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2 py-3">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Reportes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="warehouse" className="space-y-4">
            {/* Vista mejorada del almacén */}
            <Card className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white"} shadow-lg`}>
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Layers className="w-6 h-6 text-blue-600" />
                      Vista del Almacén - Todas las Alturas
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                      Columnas {currentColumnStart + 1} a {Math.min(currentColumnStart + COLUMNS_PER_VIEW, COLUMNS)} de{" "}
                      {COLUMNS}
                    </CardDescription>
                  </div>

                  {/* Controles de navegación mejorados */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateColumns("left")}
                        disabled={currentColumnStart <= 0}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium px-3 py-1 bg-white dark:bg-gray-600 rounded">
                        {Math.floor(currentColumnStart / COLUMNS_PER_VIEW) + 1} /{" "}
                        {Math.ceil(COLUMNS / COLUMNS_PER_VIEW)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateColumns("right")}
                        disabled={currentColumnStart + COLUMNS_PER_VIEW >= COLUMNS}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Vista completa del almacén con todas las alturas */}
                <div className="bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 min-h-[700px] relative overflow-hidden">
                  {/* Fondo decorativo */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 left-4 w-8 h-8 bg-blue-500 rounded-full"></div>
                    <div className="absolute top-8 right-8 w-6 h-6 bg-green-500 rounded-full"></div>
                    <div className="absolute bottom-8 left-8 w-4 h-4 bg-yellow-500 rounded-full"></div>
                  </div>

                  {/* Suelo del almacén */}
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-400 dark:from-gray-600 dark:via-gray-700 dark:to-gray-600 rounded-b-xl shadow-inner"></div>

                  {/* Grid de columnas */}
                  <div
                    className="grid gap-6 h-full"
                    style={{ gridTemplateColumns: `repeat(${getVisibleColumns().length}, 1fr)` }}
                  >
                    {getVisibleColumns().map((columnIndex) => (
                      <div key={columnIndex} className="flex flex-col h-full">
                        {/* Header de columna */}
                        <div className="text-center mb-4">
                          <div
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg ${darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-800"} shadow-md border-2 border-blue-200 dark:border-blue-800`}
                          >
                            <Grid3X3 className="w-5 h-5 text-blue-600" />
                            Col {columnIndex + 1}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {warehouse[columnIndex].reduce((total, height) => total + height.length, 0)} /{" "}
                            {HEIGHTS * MAX_BOXES_PER_HEIGHT}
                          </div>
                        </div>

                        {/* Estantes por altura */}
                        <div className="flex-1 space-y-3">
                          {Array.from({ length: HEIGHTS }, (_, heightIndex) => {
                            const reversedHeightIndex = HEIGHTS - 1 - heightIndex // Mostrar altura 5 arriba
                            const stack = warehouse[columnIndex][reversedHeightIndex]

                            return (
                              <div key={reversedHeightIndex} className="relative">
                                {/* Indicador de altura */}
                                <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 z-10">
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? "bg-gray-600 text-white" : "bg-gray-200 text-gray-700"} border-2 border-white shadow-sm`}
                                  >
                                    {reversedHeightIndex + 1}
                                  </div>
                                </div>

                                {/* Estante */}
                                <div
                                  className={`relative h-24 rounded-lg border-2 ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"} shadow-inner overflow-hidden`}
                                >
                                  {/* Fondo del estante */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                                  {/* Cajas en el estante */}
                                  <div className="absolute inset-2 flex gap-1">
                                    {stack.map((box, boxIndex) => (
                                      <div
                                        key={box.id}
                                        className={`
                                          flex-1 h-full rounded-md cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:z-10
                                          border-2 relative flex flex-col items-center justify-center text-white font-bold text-xs
                                          ${box.hasTask ? "animate-pulse border-yellow-400 shadow-yellow-400/50" : "border-white/30"}
                                        `}
                                        style={{
                                          backgroundColor: box.hasTask ? "#F59E0B" : getBoxColor(box),
                                          boxShadow: box.hasTask
                                            ? "0 0 20px rgba(245, 158, 11, 0.5)"
                                            : "0 4px 8px rgba(0,0,0,0.1)",
                                        }}
                                        onClick={() => setSelectedBox(box)}
                                      >
                                        {/* Contenido de la caja */}
                                        <div className="text-center p-1 overflow-hidden">
                                          <div className="text-xs font-bold truncate">
                                            {box.reference.split("-")[2]}
                                          </div>
                                          <div className="text-xs opacity-90 truncate">{box.ot.split("-")[1]}</div>
                                        </div>

                                        {/* Indicadores de estado */}
                                        <div className="absolute top-1 right-1 flex flex-col gap-1">
                                          {box.status === "reserved" && (
                                            <div className="w-2 h-2 bg-blue-300 rounded-full shadow-sm"></div>
                                          )}
                                          {(box.status === "damaged" || box.status === "error") && (
                                            <div className="w-2 h-2 bg-red-300 rounded-full shadow-sm"></div>
                                          )}
                                          {box.priority === "high" && (
                                            <div className="w-2 h-2 bg-orange-300 rounded-full shadow-sm"></div>
                                          )}
                                          {box.expiryDate &&
                                            new Date(box.expiryDate).getTime() - Date.now() <
                                              7 * 24 * 60 * 60 * 1000 && <Clock className="w-2 h-2 text-orange-300" />}
                                        </div>

                                        {/* Efecto de brillo para cajas con tareas */}
                                        {box.hasTask && (
                                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                                        )}
                                      </div>
                                    ))}

                                    {/* Espacios vacíos */}
                                    {Array.from({ length: MAX_BOXES_PER_HEIGHT - stack.length }, (_, emptyIndex) => (
                                      <div
                                        key={`empty-${emptyIndex}`}
                                        className={`flex-1 h-full border-2 border-dashed rounded-md opacity-30 ${darkMode ? "border-gray-500" : "border-gray-400"} bg-gradient-to-br from-transparent to-gray-100/50 dark:to-gray-800/50`}
                                      ></div>
                                    ))}
                                  </div>

                                  {/* Indicador de capacidad del estante */}
                                  <div className="absolute bottom-1 left-1 right-1">
                                    <div className="flex justify-center">
                                      <span
                                        className={`text-xs font-medium px-2 py-1 rounded ${stack.length === MAX_BOXES_PER_HEIGHT ? "bg-red-500 text-white" : stack.length > MAX_BOXES_PER_HEIGHT * 0.7 ? "bg-yellow-500 text-white" : "bg-green-500 text-white"}`}
                                      >
                                        {stack.length}/{MAX_BOXES_PER_HEIGHT}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resto de tabs simplificados... */}
          <TabsContent value="quick-actions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Entrada rápida */}
              <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-green-500" />
                    Entrada Rápida
                  </CardTitle>
                  <CardDescription>Añadir nueva caja al almacén</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="quick-reference">Referencia *</Label>
                      <Input
                        id="quick-reference"
                        value={newBox.reference}
                        onChange={(e) => setNewBox({ ...newBox, reference: e.target.value })}
                        placeholder="REF-2024-XXX"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quick-ot">OT *</Label>
                      <Input
                        id="quick-ot"
                        value={newBox.ot}
                        onChange={(e) => setNewBox({ ...newBox, ot: e.target.value })}
                        placeholder="OT-XXXXX"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="quick-category">Categoría</Label>
                        <Select
                          value={newBox.category}
                          onValueChange={(value) => setNewBox({ ...newBox, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="quick-priority">Prioridad</Label>
                        <Select
                          value={newBox.priority}
                          onValueChange={(value: any) => setNewBox({ ...newBox, priority: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="quick-client">Cliente</Label>
                      <Input
                        id="quick-client"
                        value={newBox.client}
                        onChange={(e) => setNewBox({ ...newBox, client: e.target.value })}
                        placeholder="CLI-XXX"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (newBox.reference.trim() && newBox.ot.trim()) {
                        // Buscar primera posición disponible
                        for (let col = 0; col < COLUMNS; col++) {
                          for (let height = 0; height < HEIGHTS; height++) {
                            if (warehouse[col][height].length < MAX_BOXES_PER_HEIGHT) {
                              const box: Box = {
                                id: `BOX-${Date.now()}`,
                                reference: newBox.reference,
                                ot: newBox.ot,
                                entryDate: new Date(),
                                priority: newBox.priority,
                                status: newBox.status,
                                operator: currentOperator,
                                client: newBox.client,
                                category: newBox.category,
                              }

                              const newWarehouse = [...warehouse]
                              newWarehouse[col][height] = [box, ...warehouse[col][height]]
                              setWarehouse(newWarehouse)

                              setNewBox({
                                reference: "",
                                ot: "",
                                weight: "",
                                priority: "medium",
                                status: "available",
                                category: "Otros",
                                client: "",
                                notes: "",
                                expiryDays: "",
                              })

                              toast({
                                title: "✅ Caja añadida",
                                description: `${box.reference} en Col ${col + 1}, Alt ${height + 1}`,
                              })
                              return
                            }
                          }
                        }
                        toast({
                          title: "❌ Almacén lleno",
                          description: "No hay espacio disponible",
                          variant: "destructive",
                        })
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Caja
                  </Button>
                </CardContent>
              </Card>

              {/* Otras acciones... */}
              <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Move className="w-5 h-5 text-blue-500" />
                    Movimientos
                  </CardTitle>
                  <CardDescription>Gestionar movimientos de cajas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Mover entre posiciones
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Archive className="w-4 h-4 mr-2" />
                      Archivar cajas
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reorganizar altura
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Package className="w-4 h-4 mr-2" />
                      Consolidar espacios
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Mantenimiento
                  </CardTitle>
                  <CardDescription>Tareas de mantenimiento y control</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Inspección general
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Clock className="w-4 h-4 mr-2" />
                      Revisar vencimientos
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <XCircle className="w-4 h-4 mr-2" />
                      Gestionar dañadas
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Generar inventario
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Resto de tabs simplificados... */}
          <TabsContent value="search" className="space-y-4">
            <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Búsqueda Avanzada
                </CardTitle>
                <CardDescription>Encuentra cajas por referencia, OT o cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search-term">Buscar</Label>
                    <Input
                      id="search-term"
                      placeholder="Referencia, OT, cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter-status">Estado</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="available">Disponible</SelectItem>
                        <SelectItem value="reserved">Reservada</SelectItem>
                        <SelectItem value="damaged">Dañada</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="in_transit">En tránsito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="filter-priority">Prioridad</Label>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="low">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="filter-category">Categoría</Label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Resultados ({getFilteredBoxes().length} cajas encontradas)</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("")
                        setFilterStatus("all")
                        setFilterPriority("all")
                        setFilterCategory("all")
                      }}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Limpiar filtros
                    </Button>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {getFilteredBoxes().map((box) => {
                      const position = findBoxPosition(box.id)
                      return (
                        <div
                          key={box.id}
                          className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${darkMode ? "border-gray-600" : "border-gray-200"}`}
                          onClick={() => setSelectedBox(box)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: getBoxColor(box) }}></div>
                              <div>
                                <div className="font-mono text-sm font-medium">{box.reference}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">{box.ot}</div>
                                {position && (
                                  <div className="text-xs text-gray-500">
                                    Col {position.column + 1}, Alt {position.height + 1}, Pos{" "}
                                    {position.stackPosition + 1}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(box.status)}>{box.status}</Badge>
                              <Badge className={`${getPriorityColor(box.priority)} text-white`}>{box.priority}</Badge>
                              {box.client && <Badge variant="outline">{box.client}</Badge>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Tareas pendientes */}
              <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Pendientes ({tasks.filter((t) => t.status === "pending").length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tasks
                    .filter((task) => task.status === "pending")
                    .sort((a, b) => {
                      const priorityOrder = { high: 3, medium: 2, low: 1 }
                      return priorityOrder[b.priority] - priorityOrder[a.priority]
                    })
                    .map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 border rounded-lg ${darkMode ? "border-gray-600" : "border-gray-200"}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={`${getPriorityColor(task.priority)} text-white`}>
                            {task.type.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{task.estimatedTime}min</Badge>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">{task.boxId}</div>
                          {task.fromPosition && (
                            <div className="text-gray-600 dark:text-gray-300">
                              Col {task.fromPosition.column + 1}, Alt {task.fromPosition.height + 1}
                            </div>
                          )}
                          {task.notes && <div className="text-xs text-gray-500 mt-1">{task.notes}</div>}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => {
                              setTasks((prev) =>
                                prev.map((t) => (t.id === task.id ? { ...t, status: "in_progress" as const } : t)),
                              )
                              toast({
                                title: "🚀 Tarea iniciada",
                                description: "La tarea está en progreso",
                              })
                            }}
                          >
                            Iniciar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => completeTask(task.id)}>
                            Completar
                          </Button>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Tareas en progreso */}
              <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-500" />
                    En Progreso ({tasks.filter((t) => t.status === "in_progress").length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tasks
                    .filter((task) => task.status === "in_progress")
                    .map((task) => (
                      <div
                        key={task.id}
                        className="p-3 border rounded-lg border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-blue-500 text-white">{task.type.toUpperCase()}</Badge>
                          <Badge variant="outline">{task.assignedTo}</Badge>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">{task.boxId}</div>
                          {task.fromPosition && (
                            <div className="text-gray-600 dark:text-gray-300">
                              Col {task.fromPosition.column + 1}, Alt {task.fromPosition.height + 1}
                            </div>
                          )}
                        </div>
                        <Button size="sm" className="w-full mt-3" onClick={() => completeTask(task.id)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completar
                        </Button>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Tareas completadas */}
              <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Completadas ({tasks.filter((t) => t.status === "completed").length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  {tasks
                    .filter((task) => task.status === "completed")
                    .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
                    .map((task) => (
                      <div
                        key={task.id}
                        className="p-3 border rounded-lg border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-600"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-green-500 text-white">{task.type.toUpperCase()}</Badge>
                          <div className="text-xs text-gray-500">{task.completedAt?.toLocaleTimeString()}</div>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">{task.boxId}</div>
                          <div className="text-gray-600 dark:text-gray-300">Completado por {task.assignedTo}</div>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resumen diario */}
              <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Resumen Diario
                  </CardTitle>
                  <CardDescription>Actividad del día actual</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {
                          movements.filter(
                            (m) =>
                              new Date(m.timestamp).toDateString() === new Date().toDateString() && m.type === "add",
                          ).length
                        }
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Entradas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {
                          movements.filter(
                            (m) =>
                              new Date(m.timestamp).toDateString() === new Date().toDateString() && m.type === "remove",
                          ).length
                        }
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Salidas</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Tareas completadas</span>
                      <span className="font-medium">
                        {
                          tasks.filter(
                            (t) =>
                              t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString(),
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Operario más activo</span>
                      <span className="font-medium">{currentOperator}</span>
                    </div>
                  </div>

                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Resumen
                  </Button>
                </CardContent>
              </Card>

              {/* Análisis por categorías */}
              <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    Análisis por Categorías
                  </CardTitle>
                  <CardDescription>Distribución de cajas por tipo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {CATEGORIES.map((category) => {
                    const categoryBoxes = warehouse
                      .flat()
                      .flat()
                      .filter((box) => box.category === category)
                    const percentage = Math.round((categoryBoxes.length / stats.totalBoxes) * 100) || 0

                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{category}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {categoryBoxes.length} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal de información de caja */}
        <Dialog open={showBoxModal} onOpenChange={setShowBoxModal}>
          <DialogContent className="max-w-2xl backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {selectedBox?.reference}
              </DialogTitle>
              <DialogDescription>OT: {selectedBox?.ot}</DialogDescription>
            </DialogHeader>

            {selectedBox && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Estado</Label>
                    <Badge className={getStatusColor(selectedBox.status)}>{selectedBox.status}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Prioridad</Label>
                    <Badge className={`${getPriorityColor(selectedBox.priority)} text-white`}>
                      {selectedBox.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Categoría</Label>
                    <p className="text-sm">{selectedBox.category}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Cliente</Label>
                    <p className="text-sm">{selectedBox.client || "N/A"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Peso</Label>
                    <p className="text-sm">{selectedBox.weight ? `${selectedBox.weight} kg` : "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Fecha entrada</Label>
                    <p className="text-sm">{selectedBox.entryDate.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Vencimiento</Label>
                    <p className="text-sm">
                      {selectedBox.expiryDate ? selectedBox.expiryDate.toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Operario</Label>
                    <p className="text-sm">{selectedBox.operator}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Ubicación</Label>
                    <p className="text-sm">
                      {(() => {
                        const position = findBoxPosition(selectedBox.id)
                        return position
                          ? `Col ${position.column + 1}, Alt ${position.height + 1}, Pos ${position.stackPosition + 1}`
                          : "No encontrada"
                      })()}
                    </p>
                  </div>
                </div>

                {selectedBox.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notas</Label>
                    <p className="text-sm bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">{selectedBox.notes}</p>
                  </div>
                )}

                {/* Acciones rápidas */}
                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  <Button
                    onClick={() => createTaskFromBox(selectedBox, "pick", "Solicitud de recogida")}
                    className="flex items-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Solicitar Recogida
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => createTaskFromBox(selectedBox, "move", "Solicitud de movimiento")}
                    className="flex items-center gap-2"
                  >
                    <Move className="w-4 h-4" />
                    Mover Caja
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => createTaskFromBox(selectedBox, "check", "Verificación de estado")}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Inspeccionar
                  </Button>
                  {selectedBox.status === "available" && (
                    <Button
                      variant="outline"
                      onClick={() => createTaskFromBox(selectedBox, "reserve", "Reservar para cliente")}
                      className="flex items-center gap-2"
                    >
                      <Star className="w-4 h-4" />
                      Reservar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
