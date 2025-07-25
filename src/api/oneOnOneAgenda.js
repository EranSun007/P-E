// src/api/oneOnOneAgenda.js
// Implementation of AgendaItem and PersonalFileItem entities for 1:1 meeting management

import { localClient } from './localClient.js';

// Define the AgendaItem entity
export const AgendaItem = {
  async list() {
    return localClient.entities.AgendaItem.list();
  },
  
  async create(agendaItem) {
    return localClient.entities.AgendaItem.create(agendaItem);
  },
  
  async update(id, updates) {
    return localClient.entities.AgendaItem.update(id, updates);
  },
  
  async delete(id) {
    return localClient.entities.AgendaItem.delete(id);
  },
  
  async getByTeamMember(teamMemberId) {
    return localClient.entities.AgendaItem.getByTeamMember(teamMemberId);
  },
  
  async getByStatus(status) {
    return localClient.entities.AgendaItem.getByStatus(status);
  },
  
  async getForNextMeeting(teamMemberId) {
    return localClient.entities.AgendaItem.getForNextMeeting(teamMemberId);
  }
};

// Define the PersonalFileItem entity
export const PersonalFileItem = {
  async list() {
    return localClient.entities.PersonalFileItem.list();
  },
  
  async create(personalFileItem) {
    return localClient.entities.PersonalFileItem.create(personalFileItem);
  },
  
  async update(id, updates) {
    return localClient.entities.PersonalFileItem.update(id, updates);
  },
  
  async delete(id) {
    return localClient.entities.PersonalFileItem.delete(id);
  },
  
  async getByTeamMember(teamMemberId) {
    return localClient.entities.PersonalFileItem.getByTeamMember(teamMemberId);
  },
  
  async getByCategory(category) {
    return localClient.entities.PersonalFileItem.getByCategory(category);
  },
  
  async searchByTags(tags) {
    return localClient.entities.PersonalFileItem.searchByTags(tags);
  }
};