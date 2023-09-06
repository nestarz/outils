import "graphile-config";

import { PgRBACPlugin } from "./index.ts";
import { PgAllRowsPlugin } from "./plugins/PgAllRowsPlugin.ts";
import { PgAttributeDeprecationPlugin } from "./plugins/PgAttributeDeprecationPlugin.ts";
import { PgAttributesPlugin } from "./plugins/PgAttributesPlugin.ts";
import { PgBasicsPlugin } from "./plugins/PgBasicsPlugin.ts";
import { PgCodecsPlugin } from "./plugins/PgCodecsPlugin.ts";
import { PgConditionArgumentPlugin } from "./plugins/PgConditionArgumentPlugin.ts";
import { PgConditionCustomFieldsPlugin } from "./plugins/PgConditionCustomFieldsPlugin.ts";
import { PgConnectionArgOrderByDefaultValuePlugin } from "./plugins/PgConnectionArgOrderByDefaultValuePlugin.ts";
import { PgConnectionArgOrderByPlugin } from "./plugins/PgConnectionArgOrderByPlugin.ts";
import { PgConnectionTotalCountPlugin } from "./plugins/PgConnectionTotalCountPlugin.ts";
import { PgContextPlugin } from "./plugins/PgContextPlugin.ts";
import { PgCustomTypeFieldPlugin } from "./plugins/PgCustomTypeFieldPlugin.ts";
import { PgEnumTablesPlugin } from "./plugins/PgEnumTablesPlugin.ts";
import { PgFakeConstraintsPlugin } from "./plugins/PgFakeConstraintsPlugin.ts";
import { PgFirstLastBeforeAfterArgsPlugin } from "./plugins/PgFirstLastBeforeAfterArgsPlugin.ts";
import { PgIndexBehaviorsPlugin } from "./plugins/PgIndexBehaviorsPlugin.ts";
import { PgInterfaceModeUnionAllRowsPlugin } from "./plugins/PgInterfaceModeUnionAllRowsPlugin.ts";
import { PgIntrospectionPlugin } from "./plugins/PgIntrospectionPlugin.ts";
import { PgJWTPlugin } from "./plugins/PgJWTPlugin.ts";
import { PgMutationCreatePlugin } from "./plugins/PgMutationCreatePlugin.ts";
import { PgMutationPayloadEdgePlugin } from "./plugins/PgMutationPayloadEdgePlugin.ts";
import { PgMutationUpdateDeletePlugin } from "./plugins/PgMutationUpdateDeletePlugin.ts";
import { PgNodeIdAttributesPlugin } from "./plugins/PgNodeIdAttributesPlugin.ts";
import { PgOrderAllAttributesPlugin } from "./plugins/PgOrderAllAttributesPlugin.ts";
import { PgOrderByPrimaryKeyPlugin } from "./plugins/PgOrderByPrimaryKeyPlugin.ts";
import { PgOrderCustomFieldsPlugin } from "./plugins/PgOrderCustomFieldsPlugin.ts";
import { PgPolymorphismPlugin } from "./plugins/PgPolymorphismPlugin.ts";
import { PgProceduresPlugin } from "./plugins/PgProceduresPlugin.ts";
import { PgRefsPlugin } from "./plugins/PgRefsPlugin.ts";
import { PgRegistryPlugin } from "./plugins/PgRegistryPlugin.ts";
import { PgRelationsPlugin } from "./plugins/PgRelationsPlugin.ts";
import { PgRemoveExtensionResourcesPlugin } from "./plugins/PgRemoveExtensionResourcesPlugin.ts";
import { PgRowByUniquePlugin } from "./plugins/PgRowByUniquePlugin.ts";
import { PgTableNodePlugin } from "./plugins/PgTableNodePlugin.ts";
import { PgTablesPlugin } from "./plugins/PgTablesPlugin.ts";
import { PgTypesPlugin } from "./plugins/PgTypesPlugin.ts";

// TODO: version this.
export const defaultPreset: GraphileConfig.Preset = {
  plugins: [
    PgBasicsPlugin,
    PgCodecsPlugin,
    PgContextPlugin,
    PgTypesPlugin,
    PgRefsPlugin,
    PgIntrospectionPlugin,
    PgTablesPlugin,
    PgMutationCreatePlugin,
    PgProceduresPlugin,
    PgAttributesPlugin,
    PgNodeIdAttributesPlugin,
    PgAllRowsPlugin,
    PgRowByUniquePlugin,
    PgConnectionTotalCountPlugin,
    PgRelationsPlugin,
    PgAttributeDeprecationPlugin,
    PgCustomTypeFieldPlugin,
    PgFirstLastBeforeAfterArgsPlugin,
    PgConnectionArgOrderByPlugin,
    PgConditionArgumentPlugin,
    PgConditionCustomFieldsPlugin,
    PgFakeConstraintsPlugin,
    PgOrderByPrimaryKeyPlugin,
    PgOrderAllAttributesPlugin,
    PgOrderCustomFieldsPlugin,
    PgConnectionArgOrderByDefaultValuePlugin,
    PgTableNodePlugin,
    PgMutationPayloadEdgePlugin,
    PgMutationUpdateDeletePlugin,
    PgJWTPlugin,
    PgRemoveExtensionResourcesPlugin,
    PgEnumTablesPlugin,
    PgPolymorphismPlugin,
    PgInterfaceModeUnionAllRowsPlugin,
    PgRBACPlugin,
    PgIndexBehaviorsPlugin,
    PgRegistryPlugin,
  ],
};
