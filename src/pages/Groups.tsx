import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  AlertCircle,
  Check,
  Copy,
  Link as LinkIcon,
  Plus,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import UserAvatar from "../components/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { createNotification, db } from "../lib/firebase";
import { Group, GroupMember } from "../types/groups";

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    isPublic: false,
  });
  const [selectedUsers, setSelectedUsers] = useState<GroupMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableUsers, setAvailableUsers] = useState<GroupMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<string | null>(null);
  const [removeMemberConfirm, setRemoveMemberConfirm] = useState<{ groupId: string; userId: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadGroups();
      loadAvailableUsers();
    }
  }, [user]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  const loadGroups = async () => {
    try {
      // Query semplificata che cerca solo l'userId nei membri
      const q = query(collection(db, "groups"));

      const snapshot = await getDocs(q);
      const groupsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Group[];

      setGroups(groupsData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading groups:", error);
      setError("Failed to load groups");
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const q = query(collection(db, "users"));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs
        .map((doc) => ({
          userId: doc.id,
          ...doc.data(),
          role: "member" as const,
          canSchedule: false,
        }))
        .filter((u) => u.userId !== user.uid);

      setAvailableUsers(usersData as GroupMember[]);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      if (!newGroup.name.trim()) {
        throw new Error("Group name is required");
      }

      const groupData = {
        name: newGroup.name.trim(),
        description: newGroup.description.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        members: [
          {
            userId: user.uid,
            displayName: user.displayName || user.email?.split("@")[0],
            email: user.email,
            photoURL: user.photoURL,
            role: "admin",
            canSchedule: true,
          },
          ...selectedUsers,
        ],
        isPublic: newGroup.isPublic,
        schedulingLink: `${window.location.origin}/schedule/${Math.random().toString(36).substring(2)}`,
      };

      await addDoc(collection(db, "groups"), groupData);

      setNewGroup({ name: "", description: "", isPublic: false });
      setSelectedUsers([]);
      setShowNewGroupForm(false);
      await loadGroups();
    } catch (error: any) {
      console.error("Error creating group:", error);
      setError(error.message || "Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, "groups", groupId));
      await loadGroups();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting group:", error);
      setError("Failed to delete group");
    }
  };

  const handleUpdateMember = async (groupId: string, userId: string, updates: Partial<GroupMember>) => {
    try {
      const groupRef = doc(db, "groups", groupId);
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      // Check if this would remove the last admin
      if (updates.role === "member") {
        const adminCount = group.members.filter((m) => m.role === "admin").length;
        if (adminCount <= 1 && group.members.find((m) => m.userId === userId)?.role === "admin") {
          setError("Cannot demote the last admin");
          return;
        }
      }

      const updatedMembers = group.members.map((member) =>
        member.userId === userId ? { ...member, ...updates } : member
      );

      await updateDoc(groupRef, { members: updatedMembers });
      await loadGroups();
    } catch (error) {
      console.error("Error updating member:", error);
      setError("Failed to update member");
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      const groupRef = doc(db, "groups", groupId);
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      // Check if trying to remove the last admin
      const member = group.members.find((m) => m.userId === userId);
      if (member?.role === "admin") {
        const adminCount = group.members.filter((m) => m.role === "admin").length;
        if (adminCount <= 1) {
          setError("Cannot remove the last admin");
          return;
        }
      }

      const updatedMembers = group.members.filter((member) => member.userId !== userId);
      await updateDoc(groupRef, { members: updatedMembers });

      // Notify removed member
      await createNotification(
        userId,
        "profile_update",
        "Removed from Group",
        `You have been removed from the group "${group.name}"`,
        { groupId }
      );

      await loadGroups();
      setRemoveMemberConfirm(null);
    } catch (error) {
      console.error("Error removing member:", error);
      setError("Failed to remove member");
    }
  };

  const handleAddMembers = async (groupId: string, newMembers: GroupMember[]) => {
    try {
      const groupRef = doc(db, "groups", groupId);
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      const updatedMembers = [...group.members, ...newMembers];
      await updateDoc(groupRef, { members: updatedMembers });

      // Notify new members
      for (const member of newMembers) {
        await createNotification(
          member.userId,
          "profile_update",
          "Added to Group",
          `You have been added to the group "${group.name}"`,
          { groupId }
        );
      }

      await loadGroups();
      setShowMemberForm(null);
      setSelectedUsers([]);
    } catch (error) {
      console.error("Error adding members:", error);
      setError("Failed to add members");
    }
  };

  const copySchedulingLink = (link: string) => {
    navigator.clipboard.writeText(link);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Groups</h1>
          </div>
          <button
            onClick={() => setShowNewGroupForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            Create Group
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg">{error}</div>
        )}

        {showNewGroupForm && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Create New Group</h2>
              <button
                onClick={() => {
                  setShowNewGroupForm(false);
                  setNewGroup({ name: "", description: "", isPublic: false });
                  setSelectedUsers([]);
                  setError(null);
                }}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full">
                <X className="h-5 w-5 text-blue-900 dark:text-blue-100" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter group name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Enter group description"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newGroup.isPublic}
                  onChange={(e) => setNewGroup((prev) => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isPublic" className="text-sm text-blue-900 dark:text-blue-100">
                  Make group public (anyone can request to join)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Add Members</label>
                <div className="space-y-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-2">
                        <UserAvatar photoURL={user.photoURL} displayName={user.displayName} size="sm" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{user.displayName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedUsers((prev) => prev.filter((u) => u.userId !== user.userId))}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-full">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {searchTerm && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 max-h-60 overflow-y-auto">
                        {availableUsers
                          .filter(
                            (u) =>
                              !selectedUsers.some((selected) => selected.userId === u.userId) &&
                              (u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                          )
                          .map((user) => (
                            <button
                              key={user.userId}
                              type="button"
                              onClick={() => {
                                setSelectedUsers((prev) => [...prev, user]);
                                setSearchTerm("");
                              }}
                              className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                              <UserAvatar photoURL={user.photoURL} displayName={user.displayName} size="sm" />
                              <div className="text-left">
                                <div className="font-medium text-gray-900 dark:text-white">{user.displayName}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className={`w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors ${
                  isCreating ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
                }`}>
                <Plus className="h-4 w-4" />
                {isCreating ? "Creating..." : "Create Group"}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No groups yet. Create your first group!
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const isAdmin = group.members.find((m) => m.userId === user.uid)?.role === "admin";
              return (
                <div key={group.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{group.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => setShowSettings(group.id)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg">
                            <Settings className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setShowMemberForm(group.id)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg">
                            <UserPlus className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(group.id)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {group.schedulingLink && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <LinkIcon className="h-4 w-4" />
                        <span className="text-sm">Scheduling Link</span>
                      </div>
                      <button
                        onClick={() => copySchedulingLink(group.schedulingLink!)}
                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                        <Copy className="h-4 w-4" />
                        Copy Link
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {group.members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-2">
                          <UserAvatar photoURL={member.photoURL} displayName={member.displayName} size="sm" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {member.displayName}
                              <span
                                className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                  member.role === "admin"
                                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                                    : "bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                                }`}>
                                {member.role === "admin" ? "Admin" : "Standard"}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                          </div>
                        </div>
                        {isAdmin && member.userId !== user.uid && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleUpdateMember(group.id, member.userId, {
                                  canSchedule: !member.canSchedule,
                                })
                              }
                              className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                                member.canSchedule
                                  ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
                                  : "bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                              }`}>
                              {member.canSchedule ? "Can Schedule" : "Cannot Schedule"}
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateMember(group.id, member.userId, {
                                  role: member.role === "admin" ? "member" : "admin",
                                })
                              }
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded">
                              {member.role === "admin" ? "Make Standard" : "Make Admin"}
                            </button>
                            <button
                              onClick={() => setRemoveMemberConfirm({ groupId: group.id, userId: member.userId })}
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded">
                              <UserMinus className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {deleteConfirm === group.id && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertCircle className="h-5 w-5" />
                        <span>Delete this group? This action cannot be undone.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-500">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {removeMemberConfirm?.groupId === group.id && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertCircle className="h-5 w-5" />
                        <span>Remove this member from the group?</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveMember(removeMemberConfirm.groupId, removeMemberConfirm.userId)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                          Remove
                        </button>
                        <button
                          onClick={() => setRemoveMemberConfirm(null)}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-500">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {showMemberForm === group.id && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">Add Members</h4>
                        <button
                          onClick={() => {
                            setShowMemberForm(null);
                            setSelectedUsers([]);
                          }}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full">
                          <X className="h-5 w-5 text-blue-900 dark:text-blue-100" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        {selectedUsers.map((user) => (
                          <div
                            key={user.userId}
                            className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center gap-2">
                              <UserAvatar photoURL={user.photoURL} displayName={user.displayName} size="sm" />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{user.displayName}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedUsers((prev) => prev.filter((u) => u.userId !== user.userId))}
                              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-full">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}

                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                          {searchTerm && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 max-h-60 overflow-y-auto">
                              {availableUsers
                                .filter(
                                  (u) =>
                                    !selectedUsers.some((selected) => selected.userId === u.userId) &&
                                    !group.members.some((member) => member.userId === u.userId) &&
                                    (u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                      u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                                )
                                .map((user) => (
                                  <button
                                    key={user.userId}
                                    onClick={() => {
                                      setSelectedUsers((prev) => [...prev, user]);
                                      setSearchTerm("");
                                    }}
                                    className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <UserAvatar photoURL={user.photoURL} displayName={user.displayName} size="sm" />
                                    <div className="text-left">
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {user.displayName}
                                      </div>
                                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                                    </div>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => handleAddMembers(group.id, selectedUsers)}
                          disabled={selectedUsers.length === 0}
                          className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors ${
                            selectedUsers.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
                          }`}>
                          <Check className="h-4 w-4" />
                          Add Selected Users
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
