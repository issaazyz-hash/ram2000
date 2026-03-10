/**
 * Filter Service
 * 
 * API calls for filter CRUD operations.
 */

import api from './api';
import type { Filter, FilterLink, CreateFilterDto, UpdateFilterDto, CreateLinkDto, UpdateLinkDto } from '../types/filters';

/**
 * Get all filters
 */
export const getFilters = async (): Promise<Filter[]> => {
  const response = await api.get<Filter[]>('/filters');
  return response.data;
};

/**
 * Get filter by ID
 */
export const getFilterById = async (id: string): Promise<Filter> => {
  const response = await api.get<Filter>(`/filters/${id}`);
  return response.data;
};

/**
 * Create new filter
 */
export const createFilter = async (data: CreateFilterDto): Promise<Filter> => {
  const response = await api.post<Filter>('/filters', data);
  return response.data;
};

/**
 * Update filter
 */
export const updateFilter = async (id: string, data: UpdateFilterDto): Promise<Filter> => {
  const response = await api.patch<Filter>(`/filters/${id}`, data);
  return response.data;
};

/**
 * Delete filter
 */
export const deleteFilter = async (id: string): Promise<void> => {
  await api.delete(`/filters/${id}`);
};

/**
 * Restore deleted filter
 */
export const restoreFilter = async (id: string): Promise<Filter> => {
  const response = await api.post<Filter>(`/filters/${id}/restore`);
  return response.data;
};

/**
 * Add link to filter
 */
export const addFilterLink = async (filterId: string, link: CreateLinkDto): Promise<FilterLink> => {
  const response = await api.post<FilterLink>(`/filters/${filterId}/links`, link);
  return response.data;
};

/**
 * Update filter link
 */
export const updateFilterLink = async (
  filterId: string,
  linkId: string,
  data: UpdateLinkDto
): Promise<FilterLink> => {
  const response = await api.patch<FilterLink>(`/filters/${filterId}/links/${linkId}`, data);
  return response.data;
};

/**
 * Delete filter link
 */
export const deleteFilterLink = async (filterId: string, linkId: string): Promise<void> => {
  await api.delete(`/filters/${filterId}/links/${linkId}`);
};

