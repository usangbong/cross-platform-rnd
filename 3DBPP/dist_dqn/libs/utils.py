import numpy as np
import itertools
from random import shuffle
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from mpl_toolkits.mplot3d.art3d import Line3DCollection
import matplotlib.pyplot as plt
import pandas as pd

def padding_boxes(box, max_boxes):
    box = np.array(box)
    padded = np.concatenate([box,np.zeros((max_boxes-len(box),3))])
    return padded

def cbn_select_boxes(boxes, box_idx, k):
    s_boxes = np.array(list(itertools.combinations(boxes , k)))
    s_boxes, unique_idx = np.unique(s_boxes, axis=0, return_index=True)
    comb_idx =  np.array(list(itertools.combinations( range(len(boxes)) , k))) #C,k
    comb_idx = np.array(comb_idx)[unique_idx] #C,k
    comb_idx = np.array( [box_idx[i] for i in comb_idx] )
    return s_boxes, comb_idx

def get_selected_order(selected, comb_idx, k):
    selected_order = []
    order_idx = []
    perm_idx = list(itertools.permutations(range(k)))
    for s,c in zip(selected, comb_idx):
        for i in range(len(perm_idx)):
            p = perm_idx[i] # 순서 선택
            selected_order.append( s[list(p)] )
            order_idx.append(c[list(p)])
    selected_order = np.stack(selected_order)
    selected_order, unique_idx = np.unique(selected_order, axis=0, return_index=True)
    order_idx = np.stack(order_idx)
    order_idx = order_idx[unique_idx]
    return selected_order, order_idx

def rot_one_order(s_order, s_order_idx):
    s_order_rot = s_order.copy()
    s_order_rot[:,:,0] = s_order[:,:,1]
    s_order_rot[:,:,1] = s_order[:,:,0]
    s_order_rot_idx = s_order_idx.copy() 
    s_order = np.concatenate([s_order, s_order_rot])
    s_order_idx = np.concatenate([s_order_idx, s_order_rot_idx])
    return s_order, s_order_idx

# def get_rep_order(selected, r_boxes,boxes_idx, max_k):
#     s_rep, s_rep_idx = [], []
#     for x in selected.reshape((-1, 3)):
#         i = np.where(np.all(r_boxes==x,axis=1))[0]
#         n = min(max_k, len(i))
#         s_rep.append([x]*n)
#         s_rep.append([x[[1,0,2]]]*n)
#         s_rep_idx.append(boxes_idx[i[:n]])
#         s_rep_idx.append(boxes_idx[i[:n]])
#     return s_rep, s_rep_idx

def merge_order_rep(s_order, s_order_idx, selected, r_boxes ,boxes_idx, max_k):
    s_rep, s_rep_idx = get_rep_order(selected, r_boxes ,boxes_idx, max_k)
    s_order_ = s_order.tolist() + s_rep
    s_order_idx_ = s_order_idx.tolist() + s_rep_idx
    return s_order_, s_order_idx_

def get_remain(s_boxes, r_boxes):
    for i in s_boxes:
        if i in r_boxes:
            drop_idx = np.where(np.all(i==r_boxes,axis=1))[0][0]
            r_boxes = np.delete(r_boxes, (drop_idx), axis=0)
    return r_boxes

def drop_remain(m_mat, idx):
    len_row, len_col, len_chan = m_mat.shape
    len_chan = len_chan//2
    m_mat_ = m_mat[:,:,:len_chan].copy()
    m_mat_ = np.delete(m_mat_, (idx), axis=0)
    m_mat_ = np.concatenate([m_mat_, np.zeros((len_row-len(m_mat_) , len_col, len_chan))])
    m_mat_ = np.concatenate([m_mat_, m_mat[:,:,len_chan:]], axis = -1 )
    return m_mat_

def add_loading(m_mat, loaded_idx, len_group):
    len_row, len_col, len_chan = m_mat.shape
    len_chan = len_chan//2
    m_mat_ = m_mat.copy()
    loaded_idx_ = loaded_idx[-len_group:]
    m_mat_[:len_group, :, len_chan:] = m_mat[loaded_idx[-len_group:], :, :len_chan]
    return m_mat_

def size2mat(group_size, num_max_remain, max_box_size):
    size_l = np.zeros((num_max_remain, max_box_size))
    size_b = np.zeros((num_max_remain, max_box_size))
    i = 0
    for l,b,h,w, c, n in group_size:
        size_l[i:i + int(n), :int(l)] = h
        size_b[i:i + int(n), :int(b)] = h
        i += int(n)
    size_mat = np.stack([size_l, size_b], axis=-1)
    return size_mat

def init_cbm(bbox_cbm_all, bbox_cbm_mx, cbm_mbox, boxes_idx, num_max_remain, K):
    # 대박스 CBM (1), 남은 중박스 CBM(num_max_remain), 적입된 중박스 CBM(num_max_remain), 적입할 중박스 CBM(K)
    # 0 / 1~num_max_remain+1 / num_max_remain+1~num_max_remain*2+1, -K:
    # 초기화 -> 적입된 중박스와 적입할 중박스 없음
    dim_in_cbm = num_max_remain*2 + 1 + K
    cbm_ = np.zeros((len(bbox_cbm_all), dim_in_cbm))
    cbm_[:, 0] = bbox_cbm_all/bbox_cbm_mx #대박스 CBM
    #  cbm_[:, 1:en(boxes_idx)1] = cbm_mbox[boxes_idx]
    cbm_[:, 1:min(len(boxes_idx),num_max_remain)+1] = (cbm_mbox[boxes_idx])[:num_max_remain] # 남은 중박스 CBM
    return cbm_

def get_in_cbm(s_bbox_cbm, bbox_cbm_mx,  cbm_mbox, boxes_idx, loaded_idx, len_group, idx_c, num_max_remain, K):
    dim_in_cbm = num_max_remain*2 + 1 + K
    if len(idx_c)==0:
        in_cbm = np.zeros((1, dim_in_cbm))
    else: 
        in_cbm = np.zeros((len(idx_c), dim_in_cbm))
    in_cbm[:,0] = s_bbox_cbm/bbox_cbm_mx #대박스 CBM
    #in_cbm[:, 1:len(boxes_idx)+1] = cbm_mbox[boxes_idx] # 남은 중박스 CBM
    in_cbm[:, 1:min(len(boxes_idx),num_max_remain)+1] = (cbm_mbox[boxes_idx])[:num_max_remain] 
    if len_group!=0: in_cbm[:, num_max_remain+1:num_max_remain+1+ len_group ] = cbm_mbox[loaded_idx[-len_group:]] # 적입된 중박스 CBM
    for i,c in enumerate(idx_c):
        t = dim_in_cbm if len(c)==K else -K+len(c)
        if len(c)!=0: in_cbm[i, -K:t ] = cbm_mbox[c] # 적입할 중박스 CBM
    return in_cbm

def weigth_agg_div(state_wsum):
    bbox_l_half = (state_wsum.shape[0]//2)#.astype('int')
    bbox_b_half = (state_wsum.shape[1]//2)#.astype('int')
    w1 = np.mean(state_wsum[:bbox_l_half,:bbox_b_half])
    w2 = np.mean(state_wsum[:bbox_l_half,bbox_b_half:])
    w3 = np.mean(state_wsum[bbox_l_half:,:bbox_b_half])
    w4 = np.mean(state_wsum[bbox_l_half:,bbox_b_half:])
    return [w1,w2,w3,w4]

def init_weight(num_bbox, w_mbox, boxes_idx, num_max_remain, k):
    # 남은 중박스 무게, 적입할 중박스 무게, (4분할된 무게합 상태, 4분할된 중박스 무게)
    # 초기화 -> 남은 중박스 무게만 있음
    w = np.zeros((num_bbox, num_max_remain + k + 8 ))
    w[:, :min(len(boxes_idx),num_max_remain)] = (w_mbox[boxes_idx])[:num_max_remain]  #w[:,:len(boxes_idx)] = w_mbox[boxes_idx]
    return w

def get_in_weight(w_mbox, boxes_idx, idx_c, num_max_remain, k, state_wsum, loading_loc_c):
    bbox_l, bbox_b = state_wsum.shape[0], state_wsum.shape[1] # 선택된 대박스 규격
    # 무게 정보
    if len(idx_c)==0: w = np.zeros((1, num_max_remain + k + 8))# 적입할 중박스가 없는 경우(초기화)
    else:  w = np.zeros((len(idx_c), num_max_remain + k + 8))# 적입할 중박스가 있는 경우       
    # (state) 적입되어있는 중박스
    if len(boxes_idx)>0:
        w[:, :min(len(boxes_idx),num_max_remain)] = (w_mbox[boxes_idx])[:num_max_remain]
        w[:, num_max_remain + k:num_max_remain + k + 4] = weigth_agg_div(state_wsum)# 현재 상태 4분할 무게 종합
    # (action) 적입할 중박스
    for i,c in enumerate(idx_c):
        if len(c)!=0:
            w[i,num_max_remain:num_max_remain + len(c)] = w_mbox[c] # 적입할 중박스 무게
            w[i,-4:] = weigth_agg_div(loading_loc_c[i][:bbox_l, :bbox_b, 1])# 적입할 중박스 무게 4분할 종합
    return w

def raw2input(state_s, state_h, state_w, bbox, r_mat, r_mat_all, bbox_cbm, loading_idx_c, k, e_h, num_max_remain=128): # num_selected, max_size, 
    n_combs = len(loading_idx_c)
    if len(loading_idx_c)==0: n_combs = 1
    e_l, e_b = state_h.shape
    #state = np.stack([state_s, state_h, bbox],axis = -1)
    state = np.stack([(state_s-bbox)/e_h, (state_h-bbox)/e_h, (bbox)/e_h, state_w],axis = -1)
    state_c = np.array([state]*n_combs)#.reshape((-1, e_l,e_b,4))
    #r_mat_c = np.array([r_mat]*n_combs)#/bbox_cbm #적입할 중박스의 사이즈도 포함함
    r_mat_c = np.array([r_mat[:num_max_remain]]*n_combs)#
    loading_mat_c = np.zeros((n_combs, k, r_mat_c.shape[-2], r_mat_c.shape[-1]//2) ) #C, 적입되는 박스 수, 최대 길이, (2:가로,세로)
    if len(loading_idx_c) != 0:
        for i, x in enumerate(loading_idx_c):
            if len(x)!=0: loading_mat_c[i, :len(x)] = r_mat_all[(x)][...,:r_mat_c.shape[-1]//2]
    # scaling
    #state_c = (np.array(state_c)/e_h).astype(np.float32)
    return state_c, r_mat_c, loading_mat_c

################################################################ 중박스 위치 결정
def get_fixed_loc(box, state_h, env_h):
    env_l, env_b = state_h.shape
    bxl, bxb, bxh = box[0], box[1], box[2]
    f_loc = np.where(state_h + bxh <= env_h) # 환경의 높이보다 state 작은 위치
    f_upleft = np.stack([f_loc[0], f_loc[1]], axis=-1) # array 형태로 변환
    f_upleft = f_upleft[f_upleft[:,0] + bxl  <= env_l ] # row 넘어가면 삭제
    f_upleft = f_upleft[f_upleft[:,1] + bxb <= env_b ] # columns 넘어가면 삭제  
    #f_loc = np.where(state_h[:-bxl+1,:-bxb+1] + bxh <= env_h) # 환경의 높이보다 state 작은 위치
    #f_upleft = np.stack([f_loc[0], f_loc[1]], axis=-1) # array 형태로 변환
    
    area = np.array([state_h[i:i+bxl, j:j+bxb] for i,j in f_upleft])
    loc_xyz = []
    if len(f_upleft) > 0 and len(area)>0:
        area = np.max(area, axis=(1,2)) # 적입할 수 있는 위치의 높이
        f_upleft = f_upleft[area+ bxh <= env_h] # 높이 넘으면 삭제
        area = area[area+ bxh <= env_h]
    if len(f_upleft) > 0 and len(area)>0:
        loc_xyz = np.concatenate([f_upleft, area[:, np.newaxis]], axis = -1) #xyz 좌표
        #loc_xyz = loc_xyz[np.lexsort((loc_xyz[:,1],loc_xyz[:,0],loc_xyz[:,2]))] #하나 선택
        loc_xyz = loc_xyz[loc_xyz[:,2] == np.min(loc_xyz[:,2])]
        if len(loc_xyz)>1: loc_xyz = loc_xyz[loc_xyz[:,0] == np.min(loc_xyz[:,0])]
        if len(loc_xyz)>1: loc_xyz = loc_xyz[loc_xyz[:,1] == np.min(loc_xyz[:,1])]
        loc_xyz = loc_xyz[0].astype('int')
    return loc_xyz

def get_next_state(state, state_h, upleft,bxl,bxb,bxh):
    next_state = state.copy()
    next_state_h = state_h.copy()
    next_state[upleft[0]:upleft[0]+bxl, upleft[1]:upleft[1]+bxb] += bxh
    loading_area_h =state_h[upleft[0]:upleft[0]+bxl, upleft[1]:upleft[1]+bxb]
    max_h = np.max(loading_area_h).astype('int')
    next_state_h[upleft[0]:upleft[0]+bxl, upleft[1]:upleft[1]+bxb] = max_h+bxh
    return next_state, next_state_h 

def get_selected_location(s_order, s_order_idx, state_org, state_h_org, state_w_org, e_h, k, cbm_reward ,cbm_all,w_mbox, add_skip = False):
    # 초기화
    e_l, e_b = state_org.shape
    order_idx_c = []
    loading_size_c, loading_idx_c, loading_xyz_c, num_loading_c, loading_loc_c  = [],[],[],[],[]
    next_state_c, next_state_h_c, next_state_w_c = [], [], []
    # 정해진 순서에 따라 하나씩 적재
    for order_idx, (boxes, element_idx) in enumerate(zip(s_order, s_order_idx)):
        # 초기화
        state = state_org.copy()
        state_h = state_h_org.copy()
        state_w = state_w_org.copy()
        next_state = state.copy()
        next_state_h = state_h.copy()
        next_state_w = state_w_org.copy()
        loading_size, loading_idx, loading_xyz = [],[],[]
        loading_loc = np.zeros((e_l,e_b,k)) # 적입할 위치에 높이
        loading_loc_w = np.zeros((e_l,e_b,k)) # 적입할 위치에 무게
        num_loading = 0
        cbm = cbm_reward
        # 적재 시작
        for i, (box,idx) in enumerate(zip(boxes, element_idx)): #boxes의 길이는 k
            cbm += cbm_all[idx]
            if round(cbm,4) >1:
                continue
            fixed_xyz = get_fixed_loc(box, state_h, e_h) #박스의 좌표와 next_state
            ### 해당 중박스를 적입하지 못한 경우에 스킵
            if len(fixed_xyz) == 0: 
                continue
            ### 해당 위치에 적입할 중박스보다 가벼운 중박스가 있을 경우에 스킵
            loaded_w = state_w[fixed_xyz[0]:fixed_xyz[0]+box[0], fixed_xyz[1]:fixed_xyz[1]+box[1]]
            if np.sum(loaded_w < w_mbox[idx]) > 0:
                continue
            ### 해당 중박스를 적입 했을 경우 
            # 적입 위치 (높이 & 무게)
            loading_loc[fixed_xyz[0]:fixed_xyz[0]+box[0], fixed_xyz[1]:fixed_xyz[1]+box[1], i] = fixed_xyz[2]+ box[2]
            loading_loc_w[fixed_xyz[0]:fixed_xyz[0]+box[0], fixed_xyz[1]:fixed_xyz[1]+box[1], i] = w_mbox[idx]
            # 다음 상태 계산
            next_state, next_state_h = get_next_state(state, state_h, fixed_xyz[:2], box[0], box[1], box[2])
            next_state_w[fixed_xyz[0]:fixed_xyz[0]+box[0], fixed_xyz[1]:fixed_xyz[1]+box[1]] = w_mbox[idx]
            # state 업데이트
            state = next_state.copy() 
            state_h = next_state_h.copy()
            state_w = next_state_w.copy()
            # append
            num_loading += 1 # 카운트
            loading_idx.append(idx)
            loading_size.append(box)
            loading_xyz.append(fixed_xyz)
        
        ########################################
        # append (중박스를 하나도 적재하지 않은 경우 포함, 중복 데이터만 제외)
        #if num_loading != 0: #하나 이상의 중박스를 적재했을 경우 -> append
        if num_loading != 0:#add_skip or num_loading != 0:
            # scaling
            loading_loc = loading_loc/e_h 
            # 중복 제외: loading_loc, loading_size, next_state_w_c가 동일하면 append 제외
            if len(loading_loc_c) > 0:
                idx1 = [i for i, x in enumerate(loading_loc_c) if (x==loading_loc).all()]
                idx2 = [i for i, x in enumerate(loading_size_c) if np.array((np.array(x)==loading_size)).all()]
                idx3 =  [i for i, x in enumerate(next_state_w_c) if (x==next_state_w).all()]
                num_inter = list(set(idx1) & set(idx2) & set(idx3))
                if len(num_inter) > 0:
                    #print('duplicate',set(idx1) & set(idx2), loading_size_c, loading_size, fixed_xyz)
                    continue
            # append
            order_idx_c.append(order_idx)
            num_loading_c.append(num_loading)
            loading_idx_c.append(loading_idx)
            loading_size_c.append(loading_size)
            loading_xyz_c.append(loading_xyz)
            loading_loc = np.concatenate([loading_loc, loading_loc_w], axis = -1)
            loading_loc_c.append(loading_loc)
            next_state_c.append(next_state)
            next_state_h_c.append(next_state_h)
            next_state_w_c.append(next_state_w)
            
    if add_skip and cbm_reward >= 0.93: # 중박스를 적입하지 않는 action (-> 마지막 action)
        order_idx_c.append([])
        num_loading_c.append(0)
        loading_idx_c.append([])
        loading_size_c.append([])
        loading_xyz_c.append([])
        loading_loc_c.append(np.zeros((e_l,e_b,k)))
        next_state_c.append(state)
        next_state_h_c.append(state_h)
        next_state_w_c.append(state_w)
        
    return order_idx_c, num_loading_c, loading_idx_c, loading_size_c, loading_xyz_c, loading_loc_c, next_state_c, next_state_h_c, next_state_w_c

################################################################ visualization 
def cuboid_data2(o, size=(1,1,1)):
    X = [[[0, 1, 0], [0, 0, 0], [1, 0, 0], [1, 1, 0]],
         [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]],
         [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
         [[0, 0, 1], [0, 0, 0], [0, 1, 0], [0, 1, 1]],
         [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
         [[0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1]]]
    X = np.array(X).astype(float)
    for i in range(3):
        X[:,:,i] *= size[i]
    X += np.array(o)
    return X

def plotCubeAt2(positions,sizes=None,colors=None, **kwargs):
    if not isinstance(colors,(list,np.ndarray)): colors=["C0"]*len(positions)
    if not isinstance(sizes,(list,np.ndarray)): sizes=[(1,1,1)]*len(positions)
    g = []
    for p,s,c in zip(positions,sizes,colors):
        g.append( cuboid_data2(p, size=s) )
    return Poly3DCollection(np.concatenate(g),facecolors=np.repeat(colors,6), **kwargs)

def plotCubeAt2_edge(positions,sizes, **kwargs):
    g = []
    for p,s in zip(positions, sizes):
        g.append( cuboid_data2(p, size=s) )
        print(p,s)
    return Line3DCollection(np.concatenate(g), colors='k', linewidths=1.2)

def get_colors(n_box):
    color_names=["crimson","limegreen","grey","brown","orange","olive","blue","purple","yellow","pink","skyblue","red","aqua","gold"]
    colors = color_names*(n_box//len(color_names))+color_names[:n_box%len(color_names)]
    return colors

def vis_box(sizes,positions,fs=(3,3),mn=-5, mx=25, a=0.5):
    colors = get_colors(len(positions))
    fig = plt.figure(figsize=fs)
    ax = fig.gca(projection='3d')
    ax.set_aspect('auto')
    pc = plotCubeAt2(positions,sizes,colors=colors, alpha=a, edgecolor="w")
    ax.add_collection3d(pc)    
    ax.set_xlim([mn,mx])
    #ax.set_ylim([-5,25])
    ax.set_ylim([mx,mn])
    ax.set_zlim([mn,mx])
    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
    plt.show()
    
def vis_pack(sizes, positions, bbox_sizes, bbox_positions, fs=(3,3), mn=-5, mx=25, a=0.5):
    colors = get_colors(len(positions))
    fig = plt.figure(figsize=fs)
    ax = fig.gca(projection='3d')
    ax.set_aspect('auto')
    pc = plotCubeAt2(positions,sizes,colors=colors, alpha=a, edgecolor="w")
    ax.add_collection3d(pc) 
    pc = plotCubeAt2_edge(bbox_positions, bbox_sizes)
    ax.add_collection3d(pc)    
    ax.set_xlim([mn,mx])
    ax.set_ylim([mx,mn])#ax.set_ylim([-5,25])
    ax.set_zlim([mn,mx])
    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
    plt.show()    
    
def make_ax(grid=False):
    fig = plt.figure()
    ax = fig.gca(projection='3d')
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.set_zlabel("z")
    ax.grid(grid)
    return ax
def plot_voxel(t):
    ax = make_ax(True)
    ax.voxels(t,  edgecolors='gray', shade=False, alpha = 0.8)
    plt.show()
    
################################################################ Environment  
class Bpp3DEnvMS():
    def __init__(self,length = 20, breadth = 20, height = 20, bbox_type = np.zeros((1,20,20))):
        super(Bpp3DEnvMS, self).__init__()
        self.length=length
        self.breadth=breadth
        self.height=height
        self.bbox_type = bbox_type
        self.bbox_idx = None
        self.bbox = None
        self.container_h = None
        self.container_s = None
        self.container_w = None
        self.score = {}
       
    def reset(self, bbox_idx):
        self.bbox_idx = bbox_idx
        self.bbox = self.bbox_type[self.bbox_idx].copy()
        self.container_h = self.bbox.copy()
        self.container_s = self.bbox.copy()
        self.container_w = self.bbox.copy()
        self.container_w = (self.container_w != self.height).astype('float')
        
    def step(self, next_container_s, next_container_h, next_container_w):
        self.container_s = next_container_s
        self.container_h = next_container_h
        self.container_w = next_container_w
        
    def vol_bbox(self):
        vol_bbox = self.length*self.breadth*self.height - np.sum(self.bbox)
        return vol_bbox
    
    def terminal_reward(self):
        fill = np.sum(self.container_s) - np.sum(self.bbox)
        vol_ratio = fill/self.vol_bbox()
        self.score[self.bbox_idx] = vol_ratio
        return vol_ratio
##################################################################################

