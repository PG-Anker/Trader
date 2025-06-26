import { Bot, ChartLine, PieChart, List, AlertTriangle, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tradingMode: 'spot' | 'leverage';
  onModeChange: (mode: 'spot' | 'leverage') => void;
}

export function Sidebar({ activeTab, onTabChange, tradingMode, onModeChange }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartLine },
    { id: 'summary', label: 'Summary', icon: PieChart },
    { id: 'bot-log', label: 'Bot Log', icon: List },
    { id: 'system-error', label: 'System Error', icon: AlertTriangle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-crypto-dark-800 border-r border-crypto-dark-600 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-crypto-dark-600">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">CryptoBot Pro</h1>
            <p className="text-sm text-gray-400">Automated Trading</p>
          </div>
        </div>
      </div>

      {/* Trading Mode Selection */}
      <div className="p-4 border-b border-crypto-dark-600">
        <label className="block text-sm font-medium text-gray-300 mb-2">Trading Mode</label>
        <Select value={tradingMode} onValueChange={onModeChange}>
          <SelectTrigger className="w-full bg-crypto-dark-700 border-crypto-dark-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spot">Spot Trading</SelectItem>
            <SelectItem value="leverage">Leverage Trading</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full sidebar-nav-item ${
                activeTab === item.id ? 'active' : ''
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bot Status */}
      <div className="p-4 border-t border-crypto-dark-600">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Bot Status</span>
          <Badge variant="outline" className="bg-crypto-success bg-opacity-20 text-crypto-success border-crypto-success">
            <div className="w-2 h-2 bg-crypto-success rounded-full mr-2 animate-pulse"></div>
            Active
          </Badge>
        </div>
      </div>
    </div>
  );
}
