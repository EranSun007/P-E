import { describe, it, expect, beforeEach } from 'vitest';
import { Peer } from '../entities.js';

describe('Peer Entity', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should create a new peer with all required fields', async () => {
    const peerData = {
      name: 'John Doe',
      role: 'Senior Developer',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      organization: 'External Corp',
      collaboration_context: 'Cross-team API integration project',
      relationship_type: 'cross_team',
      department: 'Engineering',
      availability: 'full_time',
      skills: ['JavaScript', 'React', 'Node.js'],
      notes: 'Primary contact for API integration'
    };

    const createdPeer = await Peer.create(peerData);

    expect(createdPeer).toBeDefined();
    expect(createdPeer.id).toBeDefined();
    expect(createdPeer.name).toBe(peerData.name);
    expect(createdPeer.role).toBe(peerData.role);
    expect(createdPeer.email).toBe(peerData.email);
    expect(createdPeer.phone).toBe(peerData.phone);
    expect(createdPeer.organization).toBe(peerData.organization);
    expect(createdPeer.collaboration_context).toBe(peerData.collaboration_context);
    expect(createdPeer.relationship_type).toBe(peerData.relationship_type);
    expect(createdPeer.department).toBe(peerData.department);
    expect(createdPeer.availability).toBe(peerData.availability);
    expect(createdPeer.skills).toEqual(peerData.skills);
    expect(createdPeer.notes).toBe(peerData.notes);
    expect(createdPeer.created_date).toBeDefined();
    expect(createdPeer.last_activity).toBeNull();
  });

  it('should create a peer with minimal data and default values', async () => {
    const peerData = {
      name: 'Jane Smith',
      role: 'Product Manager'
    };

    const createdPeer = await Peer.create(peerData);

    expect(createdPeer).toBeDefined();
    expect(createdPeer.id).toBeDefined();
    expect(createdPeer.name).toBe(peerData.name);
    expect(createdPeer.role).toBe(peerData.role);
    expect(createdPeer.phone).toBeNull();
    expect(createdPeer.email).toBeNull();
    expect(createdPeer.organization).toBeNull();
    expect(createdPeer.collaboration_context).toBeNull();
    expect(createdPeer.relationship_type).toBe('other');
    expect(createdPeer.skills).toEqual([]);
    expect(createdPeer.last_activity).toBeNull();
  });

  it('should list all peers', async () => {
    const peer1 = await Peer.create({ name: 'Peer 1', role: 'Developer' });
    const peer2 = await Peer.create({ name: 'Peer 2', role: 'Designer' });

    const peers = await Peer.list();

    expect(peers).toHaveLength(2);
    expect(peers[0].id).toBe(peer2.id); // Most recent first
    expect(peers[1].id).toBe(peer1.id);
  });

  it('should get a specific peer by id', async () => {
    const createdPeer = await Peer.create({ 
      name: 'Test Peer', 
      role: 'Tester',
      organization: 'Test Corp'
    });

    const retrievedPeer = await Peer.get(createdPeer.id);

    expect(retrievedPeer).toBeDefined();
    expect(retrievedPeer.id).toBe(createdPeer.id);
    expect(retrievedPeer.name).toBe('Test Peer');
    expect(retrievedPeer.organization).toBe('Test Corp');
  });

  it('should return null when getting non-existent peer', async () => {
    const result = await Peer.get('non-existent-id');
    expect(result).toBeNull();
  });

  it('should update a peer', async () => {
    const createdPeer = await Peer.create({ 
      name: 'Original Name', 
      role: 'Original Role',
      organization: 'Original Corp'
    });

    const updates = {
      name: 'Updated Name',
      organization: 'Updated Corp',
      collaboration_context: 'New project collaboration'
    };

    const updatedPeer = await Peer.update(createdPeer.id, updates);

    expect(updatedPeer.name).toBe('Updated Name');
    expect(updatedPeer.role).toBe('Original Role'); // Unchanged
    expect(updatedPeer.organization).toBe('Updated Corp');
    expect(updatedPeer.collaboration_context).toBe('New project collaboration');
  });

  it('should throw error when updating non-existent peer', async () => {
    await expect(Peer.update('non-existent-id', { name: 'Test' }))
      .rejects.toThrow('Peer not found');
  });

  it('should delete a peer', async () => {
    const createdPeer = await Peer.create({ name: 'To Delete', role: 'Temp' });
    
    const result = await Peer.delete(createdPeer.id);
    expect(result).toBe(true);

    const peers = await Peer.list();
    expect(peers).toHaveLength(0);
  });

  it('should handle peer-specific relationship types', async () => {
    const relationshipTypes = ['cross_team', 'external_partner', 'client_contact', 'contractor', 'other'];
    
    for (const type of relationshipTypes) {
      const peer = await Peer.create({
        name: `Peer ${type}`,
        role: 'Test Role',
        relationship_type: type
      });
      
      expect(peer.relationship_type).toBe(type);
    }
  });
});