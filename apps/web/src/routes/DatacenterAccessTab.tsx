import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { AccessUsersPage } from './AccessUsersPage'
import { AccessGroupsPage } from './AccessGroupsPage'
import { AccessRolesPage } from './AccessRolesPage'
import { ACLPage } from './ACLPage'
import { RealmsPage } from './RealmsPage'
import { AccessTokensPage } from './AccessTokensPage'
import { Users, Boxes, ShieldCheck, Shield, BellRing, KeyRound } from 'lucide-react'

export function DatacenterAccessTab() {
  const [tab, setTab] = useState('users')

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 h-auto w-full justify-start overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger value="users" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-text-muted hover:text-text-primary data-[state=active]:border-accent data-[state=active]:text-text-primary data-[state=active]:shadow-none">
            <Users className="size-3.5 mr-1.5" />Users
          </TabsTrigger>
          <TabsTrigger value="groups" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-text-muted hover:text-text-primary data-[state=active]:border-accent data-[state=active]:text-text-primary data-[state=active]:shadow-none">
            <Boxes className="size-3.5 mr-1.5" />Groups
          </TabsTrigger>
          <TabsTrigger value="roles" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-text-muted hover:text-text-primary data-[state=active]:border-accent data-[state=active]:text-text-primary data-[state=active]:shadow-none">
            <ShieldCheck className="size-3.5 mr-1.5" />Roles
          </TabsTrigger>
          <TabsTrigger value="acl" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-text-muted hover:text-text-primary data-[state=active]:border-accent data-[state=active]:text-text-primary data-[state=active]:shadow-none">
            <Shield className="size-3.5 mr-1.5" />Permissions
          </TabsTrigger>
          <TabsTrigger value="realms" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-text-muted hover:text-text-primary data-[state=active]:border-accent data-[state=active]:text-text-primary data-[state=active]:shadow-none">
            <BellRing className="size-3.5 mr-1.5" />Realms
          </TabsTrigger>
          <TabsTrigger value="tokens" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-text-muted hover:text-text-primary data-[state=active]:border-accent data-[state=active]:text-text-primary data-[state=active]:shadow-none">
            <KeyRound className="size-3.5 mr-1.5" />API Tokens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users"><AccessUsersPage /></TabsContent>
        <TabsContent value="groups"><AccessGroupsPage /></TabsContent>
        <TabsContent value="roles"><AccessRolesPage /></TabsContent>
        <TabsContent value="acl"><ACLPage /></TabsContent>
        <TabsContent value="realms"><RealmsPage /></TabsContent>
        <TabsContent value="tokens"><AccessTokensPage /></TabsContent>
      </Tabs>
    </div>
  )
}
