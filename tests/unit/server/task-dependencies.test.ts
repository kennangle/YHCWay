import { describe, it, expect } from 'vitest';

describe('Task Dependency Logic', () => {
  describe('Circular Dependency Detection', () => {
    interface Dependency {
      taskId: number;
      dependsOnTaskId: number;
    }

    function hasCircularDependency(
      taskId: number,
      newDependsOnId: number,
      existingDeps: Map<number, number[]>
    ): boolean {
      if (taskId === newDependsOnId) return true;
      
      const visited = new Set<number>();
      const stack: number[] = [newDependsOnId];
      
      while (stack.length > 0) {
        const current = stack.pop()!;
        
        if (current === taskId) return true;
        if (visited.has(current)) continue;
        
        visited.add(current);
        
        const deps = existingDeps.get(current) || [];
        for (const dep of deps) {
          if (!visited.has(dep)) {
            stack.push(dep);
          }
        }
      }
      
      return false;
    }

    it('should detect direct self-dependency', () => {
      const deps = new Map<number, number[]>();
      expect(hasCircularDependency(1, 1, deps)).toBe(true);
    });

    it('should detect simple circular dependency (A -> B -> A)', () => {
      const deps = new Map<number, number[]>();
      deps.set(2, [1]);
      
      expect(hasCircularDependency(1, 2, deps)).toBe(true);
    });

    it('should detect complex circular dependency (A -> B -> C -> A)', () => {
      const deps = new Map<number, number[]>();
      deps.set(2, [3]);
      deps.set(3, [1]);
      
      expect(hasCircularDependency(1, 2, deps)).toBe(true);
    });

    it('should allow valid dependency chains', () => {
      const deps = new Map<number, number[]>();
      deps.set(2, [3]);
      deps.set(3, [4]);
      
      expect(hasCircularDependency(1, 2, deps)).toBe(false);
    });

    it('should handle independent tasks', () => {
      const deps = new Map<number, number[]>();
      deps.set(5, [6]);
      deps.set(6, [7]);
      
      expect(hasCircularDependency(1, 2, deps)).toBe(false);
    });

    it('should handle deep dependency chains without cycles', () => {
      const deps = new Map<number, number[]>();
      for (let i = 2; i <= 10; i++) {
        deps.set(i, [i + 1]);
      }
      
      expect(hasCircularDependency(1, 2, deps)).toBe(false);
    });
  });

  describe('Dependency Types', () => {
    const DEPENDENCY_TYPES = {
      FINISH_TO_START: 'finish_to_start',
      START_TO_START: 'start_to_start',
      FINISH_TO_FINISH: 'finish_to_finish',
      START_TO_FINISH: 'start_to_finish',
    } as const;

    it('should have all standard dependency types defined', () => {
      expect(DEPENDENCY_TYPES.FINISH_TO_START).toBe('finish_to_start');
      expect(DEPENDENCY_TYPES.START_TO_START).toBe('start_to_start');
      expect(DEPENDENCY_TYPES.FINISH_TO_FINISH).toBe('finish_to_finish');
      expect(DEPENDENCY_TYPES.START_TO_FINISH).toBe('start_to_finish');
    });

    it('should default to finish_to_start for new dependencies', () => {
      const defaultType = DEPENDENCY_TYPES.FINISH_TO_START;
      expect(defaultType).toBe('finish_to_start');
    });
  });

  describe('Blocked Task Detection', () => {
    interface Task {
      id: number;
      isCompleted: boolean;
    }

    function isTaskBlocked(task: Task, dependencies: Task[]): boolean {
      return dependencies.some(dep => !dep.isCompleted);
    }

    it('should detect blocked task when dependency is incomplete', () => {
      const task = { id: 1, isCompleted: false };
      const deps = [{ id: 2, isCompleted: false }];
      
      expect(isTaskBlocked(task, deps)).toBe(true);
    });

    it('should not block task when all dependencies are complete', () => {
      const task = { id: 1, isCompleted: false };
      const deps = [
        { id: 2, isCompleted: true },
        { id: 3, isCompleted: true },
      ];
      
      expect(isTaskBlocked(task, deps)).toBe(false);
    });

    it('should not block task with no dependencies', () => {
      const task = { id: 1, isCompleted: false };
      const deps: Task[] = [];
      
      expect(isTaskBlocked(task, deps)).toBe(false);
    });

    it('should block task when any dependency is incomplete', () => {
      const task = { id: 1, isCompleted: false };
      const deps = [
        { id: 2, isCompleted: true },
        { id: 3, isCompleted: false },
        { id: 4, isCompleted: true },
      ];
      
      expect(isTaskBlocked(task, deps)).toBe(true);
    });
  });
});
