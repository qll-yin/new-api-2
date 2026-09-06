/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
export interface PromotionCommissionRecord {
  id: number
  inviter_id: number
  invitee_id: number
  trade_no: string
  recharge_amount: number
  recharge_quota: number
  commission_quota: number
  create_time: number
}

export interface PromotionInfoData {
  enabled: boolean
  rate: number
  aff_code: string
  aff_count: number
  aff_history_quota: number
  aff_pending_quota: number
  total_commission_quota: number
  commission_count: number
  items: PromotionCommissionRecord[]
  total: number
  page: number
  page_size: number
}

export type PromotionInfoResponse = ApiResponse<PromotionInfoData>
