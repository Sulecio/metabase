import { useMount } from "react-use";
import { t } from "ttag";
import type { UniqueIdentifier } from "@dnd-kit/core";
import type { Location } from "history";

import { useDispatch, useSelector } from "metabase/lib/redux";
import {
  createNewTab,
  renameTab,
  deleteTab as deleteTabAction,
  initTabs,
  selectTab,
  undoDeleteTab,
  moveTab as moveTabAction,
  duplicateTab as duplicateTabAction,
} from "metabase/dashboard/actions";
import type { SelectedTabId } from "metabase-types/store";
import { getSelectedTabId, getTabs } from "metabase/dashboard/selectors";
import { addUndo } from "metabase/redux/undo";

import { trackTabDuplicated } from "metabase/dashboard/analytics";
import type { DashboardId } from "metabase-types/api";
import { parseSlug, useSyncURLSlug } from "./use-sync-url-slug";

let tabDeletionId = 1;

export function useDashboardTabs({
  location,
  dashboardId,
}: {
  location: Location;
  dashboardId: DashboardId;
}) {
  const dispatch = useDispatch();
  const tabs = useSelector(getTabs);
  const selectedTabId = useSelector(getSelectedTabId);

  useSyncURLSlug({ location });
  useMount(() => dispatch(initTabs({ slug: parseSlug({ location }) })));

  const duplicateTab = (tabId: SelectedTabId) => {
    dispatch(duplicateTabAction(tabId));
    trackTabDuplicated(dashboardId);
  };

  const deleteTab = (tabId: SelectedTabId) => {
    const tabName = tabs.find(({ id }) => id === tabId)?.name;
    if (!tabName) {
      throw Error(`deleteTab was called but no tab with id ${tabId} was found`);
    }
    const id = tabDeletionId++;

    dispatch(deleteTabAction({ tabId, tabDeletionId: id }));
    dispatch(
      addUndo({
        message: t`Deleted "${tabName}"`,
        undo: true,
        action: () => dispatch(undoDeleteTab({ tabDeletionId: id })),
      }),
    );
  };

  const moveTab = (activeId: UniqueIdentifier, overId: UniqueIdentifier) =>
    dispatch(
      moveTabAction({
        sourceTabId:
          typeof activeId === "number" ? activeId : parseInt(activeId),
        destinationTabId:
          typeof overId === "number" ? overId : parseInt(overId),
      }),
    );

  return {
    tabs,
    selectedTabId,
    createNewTab: () => dispatch(createNewTab()),
    duplicateTab,
    deleteTab,
    renameTab: (tabId: SelectedTabId, name: string) =>
      dispatch(renameTab({ tabId, name })),
    selectTab: (tabId: SelectedTabId) => dispatch(selectTab({ tabId })),
    moveTab,
  };
}
