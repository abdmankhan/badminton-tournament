/**
 * Badminton Tournament App - Complete Source Code Generator
 *
 * Run this file with Node.js to generate all source files:
 *   node create_source_files.js
 *
 * This will create the complete application structure.
 */

const fs = require("fs");
const path = require("path");

const BASE_PATH = __dirname;

// All files to create - path relative to BASE_PATH and content
const files = {
  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  "src/lib/utils/index.js": `import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return \`\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function calculateMatchEfficiency(pointsFor, pointsAgainst, durationMinutes) {
  if (durationMinutes <= 0) return 0;
  return (pointsFor - pointsAgainst) / durationMinutes;
}
`,

  // ============================================
  // UI COMPONENTS
  // ============================================
  "src/components/ui/button.js": `import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-green-600 text-white hover:bg-green-700',
        warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-14 rounded-lg px-10 text-lg',
        icon: 'h-10 w-10',
        'icon-lg': 'h-14 w-14',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
`,

  "src/components/ui/card.js": `import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
`,

  "src/components/ui/input.js": `import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
`,

  "src/components/ui/label.js": `import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
`,

  "src/components/ui/avatar.js": `'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn, getInitials } from '@/lib/utils';

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('aspect-square h-full w-full', className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

const PlayerAvatar = ({ name, avatarUrl, size = 'default', className }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    default: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-2xl',
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={avatarUrl} alt={name} />
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
};

export { Avatar, AvatarImage, AvatarFallback, PlayerAvatar };
`,

  "src/components/ui/badge.js": `import * as React from 'react';
import { cn } from '@/lib/utils';

const Badge = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'text-foreground border border-input',
    success: 'bg-green-100 text-green-800 border border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    live: 'bg-red-500 text-white animate-pulse',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = 'Badge';

export { Badge };
`,

  "src/components/ui/dialog.js": `'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/80', className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);

const DialogFooter = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
`,

  "src/components/ui/tabs.js": `'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn('mt-2', className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
`,

  "src/components/ui/select.js": `'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn('relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover shadow-md', className)}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn('relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent', className)}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
`,

  // ============================================
  // DATABASE MODELS
  // ============================================
  "src/lib/db/mongodb.js": `import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
`,

  "src/lib/db/models/Tournament.js": `import mongoose from 'mongoose';

const TournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft',
  },
  format: {
    type: String,
    enum: ['round-robin-final', 'round-robin-semifinal-final', 'knockout'],
    default: 'round-robin-final',
  },
  numberOfTeams: {
    type: Number,
    required: true,
    min: 2,
  },
  leagueSetCount: {
    type: Number,
    default: 1,
  },
  finalSetCount: {
    type: Number,
    default: 3,
  },
  pointsPerWin: {
    type: Number,
    default: 2,
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  }],
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
  }],
}, {
  timestamps: true,
});

export default mongoose.models.Tournament || mongoose.model('Tournament', TournamentSchema);
`,

  "src/lib/db/models/Team.js": `import mongoose from 'mongoose';

const PlayerSubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  avatarUrl: {
    type: String,
    default: null,
  },
  isSubstitute: {
    type: Boolean,
    default: false,
  },
});

const TeamStatsSchema = new mongoose.Schema({
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  leaguePoints: { type: Number, default: 0 },
  pointsFor: { type: Number, default: 0 },
  pointsAgainst: { type: Number, default: 0 },
  pointDifference: { type: Number, default: 0 },
  totalDurationMinutes: { type: Number, default: 0 },
  efficiencyScore: { type: Number, default: 0 },
});

const TeamSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  players: [PlayerSubSchema],
  stats: {
    type: TeamStatsSchema,
    default: () => ({}),
  },
  rank: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Virtual for main players (non-substitutes)
TeamSchema.virtual('mainPlayers').get(function() {
  return this.players.filter(p => !p.isSubstitute);
});

// Virtual for substitutes
TeamSchema.virtual('substitutes').get(function() {
  return this.players.filter(p => p.isSubstitute);
});

export default mongoose.models.Team || mongoose.model('Team', TeamSchema);
`,

  "src/lib/db/models/Match.js": `import mongoose from 'mongoose';

const SetScoreSchema = new mongoose.Schema({
  setNumber: { type: Number, required: true },
  teamAScore: { type: Number, default: 0 },
  teamBScore: { type: Number, default: 0 },
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  isComplete: { type: Boolean, default: false },
});

const TimerStateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['stopped', 'running', 'paused'],
    default: 'stopped',
  },
  elapsedSeconds: { type: Number, default: 0 },
  lastStartedAt: { type: Date, default: null },
});

const ScoreEventSchema = new mongoose.Schema({
  actorType: {
    type: String,
    enum: ['player', 'team'],
    required: true,
  },
  playerId: {
    type: String,
    default: null,
  },
  playerName: {
    type: String,
    default: null,
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  teamName: {
    type: String,
    default: null,
  },
  actionType: {
    type: String,
    enum: ['+1', '-1'],
    required: true,
  },
  setNumber: {
    type: Number,
    default: 1,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  undone: {
    type: Boolean,
    default: false,
  },
});

const MatchSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  teamA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  teamB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  matchType: {
    type: String,
    enum: ['league', 'semifinal', 'final'],
    default: 'league',
  },
  matchNumber: {
    type: Number,
    default: 1,
  },
  setCount: {
    type: Number,
    default: 1,
  },
  currentSet: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'paused', 'completed'],
    default: 'scheduled',
  },
  sets: [SetScoreSchema],
  timerState: {
    type: TimerStateSchema,
    default: () => ({}),
  },
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
  },
  events: [ScoreEventSchema],
  startedAt: {
    type: Date,
    default: null,
  },
  endedAt: {
    type: Date,
    default: null,
  },
  durationMinutes: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Calculate current scores from non-undone events
MatchSchema.methods.calculateScores = function() {
  const activeEvents = this.events.filter(e => !e.undone);
  const scores = {};
  const playerCredits = {};
  
  for (const event of activeEvents) {
    const teamKey = event.teamId.toString();
    if (!scores[teamKey]) {
      scores[teamKey] = {};
    }
    if (!scores[teamKey][event.setNumber]) {
      scores[teamKey][event.setNumber] = 0;
    }
    
    const delta = event.actionType === '+1' ? 1 : -1;
    scores[teamKey][event.setNumber] += delta;
    
    if (event.actorType === 'player' && event.playerId) {
      if (!playerCredits[event.playerId]) {
        playerCredits[event.playerId] = 0;
      }
      playerCredits[event.playerId] += delta;
    }
  }
  
  return { scores, playerCredits };
};

export default mongoose.models.Match || mongoose.model('Match', MatchSchema);
`,

  "src/lib/db/models/index.js": `import Tournament from './Tournament';
import Team from './Team';
import Match from './Match';

export { Tournament, Team, Match };
`,

  // ============================================
  // OFFLINE STORAGE (IndexedDB with Dexie)
  // ============================================
  "src/lib/offline/db.js": `import Dexie from 'dexie';

export const db = new Dexie('BadmintonTournamentDB');

db.version(1).stores({
  tournaments: '_id, name, status, updatedAt',
  teams: '_id, tournamentId, name',
  matches: '_id, tournamentId, status, matchType',
  syncQueue: '++id, type, action, data, timestamp',
  settings: 'key',
});

// Helper to check if we're offline
export function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

// Save tournament data locally
export async function saveTournamentLocally(tournament) {
  await db.tournaments.put({
    ...tournament,
    _id: tournament._id || tournament.id,
    updatedAt: new Date().toISOString(),
  });
}

// Save team locally
export async function saveTeamLocally(team) {
  await db.teams.put({
    ...team,
    _id: team._id || team.id,
  });
}

// Save match locally
export async function saveMatchLocally(match) {
  await db.matches.put({
    ...match,
    _id: match._id || match.id,
  });
}

// Get tournament from local storage
export async function getLocalTournament(id) {
  return await db.tournaments.get(id);
}

// Get all local tournaments
export async function getLocalTournaments() {
  return await db.tournaments.toArray();
}

// Get teams for a tournament
export async function getLocalTeams(tournamentId) {
  return await db.teams.where('tournamentId').equals(tournamentId).toArray();
}

// Get matches for a tournament
export async function getLocalMatches(tournamentId) {
  return await db.matches.where('tournamentId').equals(tournamentId).toArray();
}

// Add to sync queue
export async function addToSyncQueue(type, action, data) {
  await db.syncQueue.add({
    type,
    action,
    data,
    timestamp: new Date().toISOString(),
  });
}

// Get pending sync items
export async function getPendingSyncItems() {
  return await db.syncQueue.toArray();
}

// Clear sync queue items
export async function clearSyncQueueItems(ids) {
  await db.syncQueue.bulkDelete(ids);
}

// Clear all local data
export async function clearLocalData() {
  await db.tournaments.clear();
  await db.teams.clear();
  await db.matches.clear();
  await db.syncQueue.clear();
}
`,

  "src/lib/offline/sync.js": `import { db, getPendingSyncItems, clearSyncQueueItems, isOffline } from './db';

// Sync pending changes to server
export async function syncToServer() {
  if (isOffline()) {
    console.log('Offline - skipping sync');
    return { success: false, reason: 'offline' };
  }

  const pendingItems = await getPendingSyncItems();
  if (pendingItems.length === 0) {
    return { success: true, synced: 0 };
  }

  const syncedIds = [];
  const errors = [];

  for (const item of pendingItems) {
    try {
      const endpoint = getEndpointForSync(item.type, item.action);
      const response = await fetch(endpoint, {
        method: getMethodForAction(item.action),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });

      if (response.ok) {
        syncedIds.push(item.id);
      } else {
        errors.push({ id: item.id, error: await response.text() });
      }
    } catch (error) {
      errors.push({ id: item.id, error: error.message });
    }
  }

  if (syncedIds.length > 0) {
    await clearSyncQueueItems(syncedIds);
  }

  return {
    success: errors.length === 0,
    synced: syncedIds.length,
    errors,
  };
}

function getEndpointForSync(type, action) {
  const baseUrl = '/api';
  const endpoints = {
    tournament: {
      create: \`\${baseUrl}/tournaments\`,
      update: \`\${baseUrl}/tournaments\`,
    },
    team: {
      create: \`\${baseUrl}/teams\`,
      update: \`\${baseUrl}/teams\`,
    },
    match: {
      update: \`\${baseUrl}/matches\`,
      score: \`\${baseUrl}/matches/score\`,
    },
  };
  return endpoints[type]?.[action] || \`\${baseUrl}/\${type}s\`;
}

function getMethodForAction(action) {
  const methods = {
    create: 'POST',
    update: 'PUT',
    delete: 'DELETE',
    score: 'POST',
  };
  return methods[action] || 'POST';
}

// Initialize sync listener
export function initSyncListener() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', async () => {
    console.log('Back online - syncing...');
    await syncToServer();
  });
}
`,

  // ============================================
  // SCORING LOGIC
  // ============================================
  "src/lib/scoring/engine.js": `import { generateId } from '@/lib/utils';

/**
 * Creates a score event
 */
export function createScoreEvent({
  actorType, // 'player' or 'team'
  playerId = null,
  playerName = null,
  teamId,
  teamName,
  actionType, // '+1' or '-1'
  setNumber = 1,
}) {
  return {
    id: generateId(),
    actorType,
    playerId,
    playerName,
    teamId,
    teamName,
    actionType,
    setNumber,
    timestamp: new Date().toISOString(),
    undone: false,
  };
}

/**
 * Calculates current scores from events
 */
export function calculateScoresFromEvents(events, teamAId, teamBId) {
  const activeEvents = events.filter(e => !e.undone);
  
  const scores = {
    teamA: {},
    teamB: {},
    playerCredits: {},
  };
  
  for (const event of activeEvents) {
    const isTeamA = event.teamId === teamAId || event.teamId?.toString() === teamAId?.toString();
    const teamKey = isTeamA ? 'teamA' : 'teamB';
    const setNum = event.setNumber || 1;
    
    if (!scores[teamKey][setNum]) {
      scores[teamKey][setNum] = 0;
    }
    
    const delta = event.actionType === '+1' ? 1 : -1;
    scores[teamKey][setNum] = Math.max(0, scores[teamKey][setNum] + delta);
    
    if (event.actorType === 'player' && event.playerId) {
      if (!scores.playerCredits[event.playerId]) {
        scores.playerCredits[event.playerId] = 0;
      }
      scores.playerCredits[event.playerId] = Math.max(0, scores.playerCredits[event.playerId] + delta);
    }
  }
  
  return scores;
}

/**
 * Gets total score for a team across all sets
 */
export function getTotalScore(setScores) {
  return Object.values(setScores).reduce((sum, score) => sum + score, 0);
}

/**
 * Undo the last scoring action
 */
export function undoLastEvent(events) {
  const activeEvents = events.filter(e => !e.undone);
  if (activeEvents.length === 0) {
    return { events, undoneEvent: null };
  }
  
  const lastEvent = activeEvents[activeEvents.length - 1];
  const updatedEvents = events.map(e => 
    e.id === lastEvent.id ? { ...e, undone: true } : e
  );
  
  return { events: updatedEvents, undoneEvent: lastEvent };
}

/**
 * Determines the winner of a match based on sets won
 */
export function determineMatchWinner(sets, setCount, teamAId, teamBId) {
  const setsToWin = Math.ceil(setCount / 2);
  
  let teamASetsWon = 0;
  let teamBSetsWon = 0;
  
  for (const set of sets) {
    if (set.isComplete && set.winnerId) {
      if (set.winnerId === teamAId || set.winnerId?.toString() === teamAId?.toString()) {
        teamASetsWon++;
      } else {
        teamBSetsWon++;
      }
    }
  }
  
  if (teamASetsWon >= setsToWin) {
    return teamAId;
  }
  if (teamBSetsWon >= setsToWin) {
    return teamBId;
  }
  
  return null; // Match not decided yet
}
`,

  // ============================================
  // STANDINGS CALCULATION
  // ============================================
  "src/lib/standings/calculator.js": `/**
 * Calculate standings for all teams in a tournament
 */
export function calculateStandings(teams, matches) {
  const completedMatches = matches.filter(m => m.status === 'completed' && m.matchType === 'league');
  
  // Initialize stats for each team
  const standings = teams.map(team => ({
    teamId: team._id || team.id,
    teamName: team.name,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    leaguePoints: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDifference: 0,
    totalDurationMinutes: 0,
    efficiencyScore: 0,
    headToHead: {},
  }));

  const standingsMap = new Map(standings.map(s => [s.teamId?.toString(), s]));

  // Process each completed match
  for (const match of completedMatches) {
    const teamAId = (match.teamA?._id || match.teamA)?.toString();
    const teamBId = (match.teamB?._id || match.teamB)?.toString();
    const winnerId = match.winnerId?.toString();

    const teamAStats = standingsMap.get(teamAId);
    const teamBStats = standingsMap.get(teamBId);

    if (!teamAStats || !teamBStats) continue;

    // Calculate total points for each team in this match
    let teamAPoints = 0;
    let teamBPoints = 0;

    if (match.sets && match.sets.length > 0) {
      for (const set of match.sets) {
        teamAPoints += set.teamAScore || 0;
        teamBPoints += set.teamBScore || 0;
      }
    }

    const duration = match.durationMinutes || 1;

    // Update Team A stats
    teamAStats.matchesPlayed++;
    teamAStats.pointsFor += teamAPoints;
    teamAStats.pointsAgainst += teamBPoints;
    teamAStats.totalDurationMinutes += duration;

    // Update Team B stats
    teamBStats.matchesPlayed++;
    teamBStats.pointsFor += teamBPoints;
    teamBStats.pointsAgainst += teamAPoints;
    teamBStats.totalDurationMinutes += duration;

    // Update wins/losses
    if (winnerId === teamAId) {
      teamAStats.wins++;
      teamAStats.leaguePoints += 2;
      teamBStats.losses++;
      teamAStats.headToHead[teamBId] = 'win';
      teamBStats.headToHead[teamAId] = 'loss';
    } else if (winnerId === teamBId) {
      teamBStats.wins++;
      teamBStats.leaguePoints += 2;
      teamAStats.losses++;
      teamBStats.headToHead[teamAId] = 'win';
      teamAStats.headToHead[teamBId] = 'loss';
    }

    // Calculate match efficiency for this match
    const teamAMatchEfficiency = (teamAPoints - teamBPoints) / duration;
    const teamBMatchEfficiency = (teamBPoints - teamAPoints) / duration;

    teamAStats.efficiencyScore += teamAMatchEfficiency;
    teamBStats.efficiencyScore += teamBMatchEfficiency;
  }

  // Calculate point differences and round efficiency scores
  for (const s of standings) {
    s.pointDifference = s.pointsFor - s.pointsAgainst;
    s.efficiencyScore = Math.round(s.efficiencyScore * 1000) / 1000;
  }

  // Sort standings
  standings.sort((a, b) => {
    // 1. League points (descending)
    if (b.leaguePoints !== a.leaguePoints) {
      return b.leaguePoints - a.leaguePoints;
    }

    // 2. Tournament Efficiency Score (descending)
    if (b.efficiencyScore !== a.efficiencyScore) {
      return b.efficiencyScore - a.efficiencyScore;
    }

    // 3. Head-to-head result
    const h2h = a.headToHead[b.teamId?.toString()];
    if (h2h === 'win') return -1;
    if (h2h === 'loss') return 1;

    // 4. Point difference (descending)
    if (b.pointDifference !== a.pointDifference) {
      return b.pointDifference - a.pointDifference;
    }

    // 5. Points for (descending)
    return b.pointsFor - a.pointsFor;
  });

  // Assign ranks
  standings.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return standings;
}

/**
 * Get top N teams from standings
 */
export function getTopTeams(standings, n) {
  return standings.slice(0, n);
}

/**
 * Format efficiency score for display
 */
export function formatEfficiencyScore(score) {
  if (score === 0) return '0.000';
  return score > 0 ? \`+\${score.toFixed(3)}\` : score.toFixed(3);
}
`,

  // ============================================
  // FIXTURE GENERATION
  // ============================================
  "src/lib/scoring/fixtures.js": `import { generateId } from '@/lib/utils';

/**
 * Generate round-robin fixtures for N teams
 * Returns array of match pairings [{teamA, teamB}]
 */
export function generateRoundRobinFixtures(teamIds) {
  const fixtures = [];
  const n = teamIds.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      fixtures.push({
        teamA: teamIds[i],
        teamB: teamIds[j],
        matchNumber: fixtures.length + 1,
      });
    }
  }

  return fixtures;
}

/**
 * Create match objects from fixtures
 */
export function createMatchesFromFixtures(fixtures, tournamentId, setCount = 1) {
  return fixtures.map((fixture, idx) => ({
    _id: generateId(),
    tournamentId,
    teamA: fixture.teamA,
    teamB: fixture.teamB,
    matchType: 'league',
    matchNumber: idx + 1,
    setCount,
    currentSet: 1,
    status: 'scheduled',
    sets: Array.from({ length: setCount }, (_, i) => ({
      setNumber: i + 1,
      teamAScore: 0,
      teamBScore: 0,
      winnerId: null,
      isComplete: false,
    })),
    timerState: {
      status: 'stopped',
      elapsedSeconds: 0,
      lastStartedAt: null,
    },
    winnerId: null,
    events: [],
    startedAt: null,
    endedAt: null,
    durationMinutes: 0,
  }));
}

/**
 * Create final match between top 2 teams
 */
export function createFinalMatch(tournamentId, teamAId, teamBId, setCount = 3) {
  return {
    _id: generateId(),
    tournamentId,
    teamA: teamAId,
    teamB: teamBId,
    matchType: 'final',
    matchNumber: 0, // Finals don't have match numbers in the league sequence
    setCount,
    currentSet: 1,
    status: 'scheduled',
    sets: Array.from({ length: setCount }, (_, i) => ({
      setNumber: i + 1,
      teamAScore: 0,
      teamBScore: 0,
      winnerId: null,
      isComplete: false,
    })),
    timerState: {
      status: 'stopped',
      elapsedSeconds: 0,
      lastStartedAt: null,
    },
    winnerId: null,
    events: [],
    startedAt: null,
    endedAt: null,
    durationMinutes: 0,
  };
}
`,

  // ============================================
  // ZUSTAND STORES
  // ============================================
  "src/stores/tournamentStore.js": `import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useTournamentStore = create(
  persist(
    (set, get) => ({
      // Current active tournament
      activeTournament: null,
      teams: [],
      matches: [],
      standings: [],

      // Mode
      isAdmin: false,
      setIsAdmin: (isAdmin) => set({ isAdmin }),

      // Set active tournament
      setActiveTournament: (tournament) => set({ activeTournament: tournament }),

      // Set teams
      setTeams: (teams) => set({ teams }),

      // Set matches
      setMatches: (matches) => set({ matches }),

      // Update a single match
      updateMatch: (matchId, updates) => set((state) => ({
        matches: state.matches.map((m) =>
          (m._id === matchId || m.id === matchId) ? { ...m, ...updates } : m
        ),
      })),

      // Set standings
      setStandings: (standings) => set({ standings }),

      // Clear all data
      clearData: () => set({
        activeTournament: null,
        teams: [],
        matches: [],
        standings: [],
      }),
    }),
    {
      name: 'tournament-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
`,

  "src/stores/matchStore.js": `import { create } from 'zustand';
import { createScoreEvent, calculateScoresFromEvents, undoLastEvent } from '@/lib/scoring/engine';

export const useMatchStore = create((set, get) => ({
  // Current match being scored
  currentMatch: null,
  
  // Timer state
  timerSeconds: 0,
  timerRunning: false,
  timerInterval: null,

  // Load a match for scoring
  loadMatch: (match) => {
    const state = get();
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
    }
    
    set({
      currentMatch: match,
      timerSeconds: match.timerState?.elapsedSeconds || 0,
      timerRunning: false,
      timerInterval: null,
    });
  },

  // Add a score event
  addScoreEvent: (eventData) => {
    const { currentMatch } = get();
    if (!currentMatch) return null;

    const event = createScoreEvent({
      ...eventData,
      setNumber: currentMatch.currentSet || 1,
    });

    const updatedEvents = [...(currentMatch.events || []), event];
    const updatedMatch = { ...currentMatch, events: updatedEvents };

    set({ currentMatch: updatedMatch });
    return event;
  },

  // Undo last event
  undoLast: () => {
    const { currentMatch } = get();
    if (!currentMatch) return null;

    const { events, undoneEvent } = undoLastEvent(currentMatch.events || []);
    const updatedMatch = { ...currentMatch, events };

    set({ currentMatch: updatedMatch });
    return undoneEvent;
  },

  // Get current scores
  getCurrentScores: () => {
    const { currentMatch } = get();
    if (!currentMatch) return null;

    return calculateScoresFromEvents(
      currentMatch.events || [],
      currentMatch.teamA?._id || currentMatch.teamA,
      currentMatch.teamB?._id || currentMatch.teamB
    );
  },

  // Timer controls
  startTimer: () => {
    const { timerRunning, timerInterval } = get();
    if (timerRunning) return;

    const interval = setInterval(() => {
      set((state) => ({ timerSeconds: state.timerSeconds + 1 }));
    }, 1000);

    set({ timerRunning: true, timerInterval: interval });
  },

  pauseTimer: () => {
    const { timerInterval } = get();
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    set({ timerRunning: false, timerInterval: null });
  },

  resetTimer: () => {
    const { timerInterval } = get();
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    set({ timerSeconds: 0, timerRunning: false, timerInterval: null });
  },

  // Update current set
  setCurrentSet: (setNumber) => {
    const { currentMatch } = get();
    if (!currentMatch) return;

    set({
      currentMatch: { ...currentMatch, currentSet: setNumber },
    });
  },

  // Clear match
  clearMatch: () => {
    const { timerInterval } = get();
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    set({
      currentMatch: null,
      timerSeconds: 0,
      timerRunning: false,
      timerInterval: null,
    });
  },
}));
`,

  // ============================================
  // CUSTOM HOOKS
  // ============================================
  "src/hooks/useOnlineStatus.js": `'use client';

import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
`,

  "src/hooks/useLocalStorage.js": `'use client';

import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(initialValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }
  }, [key]);

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  return [storedValue, setValue];
}
`,

  // ============================================
  // APP PAGES - GLOBALS & LAYOUT
  // ============================================
  "src/app/globals.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 142.1 76.2% 36.3%;
    --primary-foreground: 355.7 100% 97.3%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 142.1 76.2% 36.3%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@layer utilities {
  .score-display {
    @apply text-6xl font-bold tabular-nums;
  }
  
  .player-card {
    @apply p-4 rounded-lg border bg-card shadow-sm transition-all hover:shadow-md;
  }
  
  .action-button {
    @apply w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-all active:scale-95;
  }
}
`,

  "src/app/layout.js": `import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Badminton Tournament Manager',
  description: 'Live scoring and tournament management for doubles badminton',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
`,

  "src/app/page.js": `'use client';

import Link from 'next/link';
import { Trophy, Users, Eye, Shield, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTournamentStore } from '@/stores/tournamentStore';

export default function Home() {
  const isOnline = useOnlineStatus();
  const setIsAdmin = useTournamentStore((state) => state.setIsAdmin);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-4xl w-full space-y-8">
        {/* Online Status */}
        <div className="flex justify-center">
          <div className={\`flex items-center gap-2 px-3 py-1 rounded-full text-sm \${isOnline ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}\`}>
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {isOnline ? 'Online' : 'Offline Mode'}
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="h-12 w-12 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Badminton Tournament
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Complete tournament management system for doubles badminton. 
            Create tournaments, score matches live, track standings, and view player statistics.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-lg bg-white shadow-sm">
            <Users className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="font-medium">Team Management</p>
          </div>
          <div className="p-4 rounded-lg bg-white shadow-sm">
            <Trophy className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="font-medium">Live Scoring</p>
          </div>
          <div className="p-4 rounded-lg bg-white shadow-sm">
            <Shield className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="font-medium">Offline Support</p>
          </div>
          <div className="p-4 rounded-lg bg-white shadow-sm">
            <Eye className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="font-medium">Leaderboards</p>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="grid md:grid-cols-2 gap-6 pt-8">
          <Card className="border-2 hover:border-primary transition-colors">
            <Link href="/admin" onClick={() => setIsAdmin(true)}>
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Admin Mode</CardTitle>
                <CardDescription>Full access to manage tournaments</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>✓ Create & manage tournaments</li>
                  <li>✓ Add teams and players</li>
                  <li>✓ Score matches live</li>
                  <li>✓ Undo/correct scores</li>
                  <li>✓ Complete tournament control</li>
                </ul>
                <Button className="w-full" size="lg">Enter as Admin</Button>
              </CardContent>
            </Link>
          </Card>

          <Card className="border-2 hover:border-blue-500 transition-colors">
            <Link href="/viewer" onClick={() => setIsAdmin(false)}>
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Eye className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-2xl">Viewer Mode</CardTitle>
                <CardDescription>Watch tournaments and view stats</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>✓ View live matches</li>
                  <li>✓ See team standings</li>
                  <li>✓ Track player statistics</li>
                  <li>✓ Follow tournament progress</li>
                  <li>✓ Read-only access</li>
                </ul>
                <Button variant="outline" className="w-full border-blue-500 text-blue-500 hover:bg-blue-50" size="lg">
                  Enter as Viewer
                </Button>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground pt-8">
          <p>Works offline • Auto-syncs when connected • Mobile-friendly</p>
        </footer>
      </div>
    </main>
  );
}
`,
};

// Create file with directories
function createFile(relativePath, content) {
  const fullPath = path.join(BASE_PATH, relativePath);
  const dir = path.dirname(fullPath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content);
  console.log(`Created: ${relativePath}`);
}

// Main execution
console.log("Creating Badminton Tournament App source files...\n");

Object.entries(files).forEach(([filePath, content]) => {
  createFile(filePath, content);
});

console.log("\n✅ All files created successfully!");
console.log("\nNext steps:");
console.log("1. Run: npm install");
console.log("2. Create .env.local with your MongoDB connection string");
console.log("3. Run: npm run dev");
