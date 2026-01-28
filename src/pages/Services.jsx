import { Server, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useAppMode } from "@/contexts/AppModeContext.jsx";
import { cn } from "@/lib/utils";

export default function Services() {
  const { isProductMode } = useAppMode();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn(
            "text-3xl font-bold",
            isProductMode ? "text-white" : "text-gray-900"
          )}>My Services</h1>
          <p className={cn(
            "mt-1",
            isProductMode ? "text-gray-400" : "text-gray-500"
          )}>Manage and monitor your product services</p>
        </div>
        <Button className={isProductMode ? "bg-purple-600 hover:bg-purple-700" : ""}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      <Card className={cn(
        "border-dashed",
        isProductMode ? "bg-gray-900 border-gray-700" : ""
      )}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Server className={cn(
            "h-16 w-16 mb-4",
            isProductMode ? "text-gray-600" : "text-gray-300"
          )} />
          <CardTitle className={cn(
            "text-xl mb-2",
            isProductMode ? "text-gray-300" : "text-gray-500"
          )}>No services yet</CardTitle>
          <p className={cn(
            "text-center max-w-md",
            isProductMode ? "text-gray-500" : "text-gray-400"
          )}>
            Start tracking your product services here. Add services to monitor their health,
            dependencies, and usage metrics.
          </p>
          <Button variant="outline" className={cn(
            "mt-6",
            isProductMode ? "border-gray-600 text-gray-300 hover:bg-gray-800" : ""
          )}>
            <Plus className="h-4 w-4 mr-2" />
            Add your first service
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
