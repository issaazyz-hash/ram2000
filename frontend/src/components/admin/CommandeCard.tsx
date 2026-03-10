import React from "react";
import { Package, Phone, MapPin, Calendar, Trash2 } from "lucide-react";
import type { OrderData } from "@/api/database";

interface CommandeCardProps {
  order: OrderData;
  onAccept: (id: number) => void;
  onRefuse: (id: number) => void;
  onDelete: (id: number) => void;
  getOrderStatusLabel: (status: string | undefined | null) => string;
  isOrderPending: (order: OrderData) => boolean;
}

export function CommandeCard({
  order,
  onAccept,
  onRefuse,
  onDelete,
  getOrderStatusLabel,
  isOrderPending,
}: CommandeCardProps) {
  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  const formattedDate = orderDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = orderDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const productImage =
    order.product_snapshot?.image ||
    order.product_image ||
    (Array.isArray(order.product_snapshot?.images) && order.product_snapshot.images.length > 0
      ? order.product_snapshot.images[0]
      : null);

  const status = (order as any).status;
  const statusPillClass =
    status === "accepted"
      ? "bg-green-100 text-green-800"
      : status === "rejected" || status === "refused"
        ? "bg-red-100 text-red-800"
        : "bg-yellow-100 text-yellow-800";

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${
        isOrderPending(order) ? "pending-row" : ""
      }`}
    >
      {/* Header: Product name + Status badge */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {productImage ? (
            <img
              src={productImage}
              alt={order.product_name}
              className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-7 h-7 text-gray-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-base text-gray-900 leading-tight line-clamp-2">
              {order.product_name}
            </h4>
          </div>
        </div>
        {status != null && (
          <span className={`text-xs font-semibold px-2 py-1 rounded flex-shrink-0 ${statusPillClass}`}>
            {getOrderStatusLabel(status)}
          </span>
        )}
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-2 gap-3 py-3 border-b border-gray-100">
        <div>
          <span className="text-xs font-medium text-gray-500">Prix</span>
          <p className="text-sm font-semibold text-orange-600">
            {parseFloat(String(order.product_price || 0)).toFixed(3)} DT
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">Qté</span>
          <p className="text-sm font-medium">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
              {order.quantity}
            </span>
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">Marque</span>
          <p className="text-sm text-gray-900 truncate">
            {(order as any).brand_name || order.product_snapshot?.brand_name || "—"}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">Modèle</span>
          <p className="text-sm text-gray-900 truncate">
            {(order as any).model_name || order.product_snapshot?.model_name || "—"}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">Référence</span>
          <p className="text-sm text-gray-900 truncate">
            {order.product_references?.length
              ? order.product_references.slice(0, 2).join(", ")
              : "—"}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" />
            Téléphone
          </span>
          <a
            href={`tel:${order.customer_phone}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {order.customer_phone}
          </a>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            Wilaya
          </span>
          <p className="text-sm text-gray-900">{order.customer_wilaya}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">Délégation</span>
          <p className="text-sm text-gray-900 truncate">{order.customer_delegation}</p>
        </div>
        <div className="col-span-2">
          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Date
          </span>
          <p className="text-sm text-gray-900">
            {formattedDate} {formattedTime}
          </p>
        </div>
      </div>

      {/* Client */}
      <div className="py-2">
        <span className="text-xs font-medium text-gray-500">Client</span>
        <p className="text-sm font-semibold text-gray-900">
          {order.customer_prenom} {order.customer_nom}
        </p>
      </div>

      {/* Actions */}
      <div className="pt-3 border-t border-gray-200 flex flex-col gap-2">
        {isOrderPending(order) && (
          <div className="flex gap-2">
            <button
              onClick={() => order.id != null && onAccept(order.id)}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
              aria-label="Accepter"
            >
              Accepter
            </button>
            <button
              onClick={() => order.id != null && onRefuse(order.id)}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
              aria-label="Refuser"
            >
              Refuser
            </button>
          </div>
        )}
        <button
          onClick={() => order.id != null && onDelete(order.id)}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          aria-label="Supprimer la commande"
        >
          <Trash2 className="w-4 h-4" />
          Supprimer
        </button>
      </div>
    </div>
  );
}
